import { XMLParser } from 'fast-xml-parser'

export interface ParsedItem {
    nItem: number
    cProd: string
    cEAN: string
    xProd: string
    NCM: string
    CFOP: string
    uCom: string
    qCom: number
    vUnCom: number
    vProd: number
    vDesc: number
    vIPI: number
    vICMS: number
}

export interface ParsedXML {
    chNFe: string
    dhEmi: string
    nNF: string
    supplier: {
        xNome: string
        CNPJ: string
        IE: string
    }
    buyer: {
        xNome: string
        CNPJ: string
    }
    items: ParsedItem[]
    totals: {
        vProd: number
        vDesc: number
        vNF: number
    }
}

type ParsedTaxNode = {
    vICMS?: string | number
}

export class XMLImporter {
    /**
     * Faz o parse de um XML de NF-e (Sefaz) e extrai os dados estruturados para review.
     */
    static parseNFe(xmlString: string): ParsedXML {
        const parser = new XMLParser({
            ignoreAttributes: false,
            parseAttributeValue: true,
            trimValues: true
        })

        const raw = parser.parse(xmlString)

        // NF-e pode vir diretamente como <NFe> ou envelopada em <nfeProc>
        const nfeObj = raw?.nfeProc?.NFe || raw?.NFe
        if (!nfeObj || !nfeObj.infNFe) {
            throw new Error('Formato de XML inválido. Não foi encontrada a tag <infNFe>. Certifique-se de que é um XML de NF-e válido (ProcNFe).')
        }

        const infNFe = nfeObj.infNFe

        // 1. Chave de acesso (ID do infNFe começa com "NFe")
        const chNFe = String(infNFe['@_Id']).replace('NFe', '')

        // 2. Dados de emissão
        const ide = infNFe.ide || {}
        const nNF = String(ide.nNF || '')
        const dhEmi = String(ide.dhEmi || '')

        // 3. Fornecedor (Emitente)
        const emit = infNFe.emit || {}
        const supplier = {
            xNome: String(emit.xNome || ''),
            CNPJ: String(emit.CNPJ || ''),
            IE: String(emit.IE || '')
        }

        // 4. Comprador (Destinatário)
        const dest = infNFe.dest || {}
        const buyer = {
            xNome: String(dest.xNome || ''),
            CNPJ: String(dest.CNPJ || '')
        }

        // 5. Itens
        let rawDet = infNFe.det || []
        if (!Array.isArray(rawDet)) {
            rawDet = [rawDet] // Se houver apenas 1 item, fast-xml-parser não cria array
        }

        const items: ParsedItem[] = rawDet.map((detNode: Record<string, unknown>) => {
            const prod = detNode.prod || {}

            // Impostos básicos
            const imposto = (detNode.imposto as Record<string, unknown> | undefined) || {}
            const icms = imposto.ICMS as Record<string, ParsedTaxNode> | undefined
            const icmsNode: ParsedTaxNode = icms ? Object.values(icms)[0] || {} : {}
            const ipi = imposto.IPI as { IPITrib?: Record<string, unknown> } | undefined
            const ipiNode = ipi?.IPITrib || {}

            const prodNode = (prod as Record<string, unknown>) || {}
            const itemNumber = detNode['@_nItem']

            return {
                nItem: parseInt(String(itemNumber || '0')),
                cProd: String(prodNode.cProd || ''),
                cEAN: String(prodNode.cEAN || ''),
                xProd: String(prodNode.xProd || ''),
                NCM: String(prodNode.NCM || ''),
                CFOP: String(prodNode.CFOP || ''),
                uCom: String(prodNode.uCom || ''),
                qCom: parseFloat(String(prodNode.qCom || '0')),
                vUnCom: parseFloat(String(prodNode.vUnCom || '0')),
                vProd: parseFloat(String(prodNode.vProd || '0')),
                vDesc: parseFloat(String(prodNode.vDesc || '0')),
                vIPI: parseFloat(String(ipiNode.vIPI || '0')),
                vICMS: parseFloat(String(icmsNode.vICMS || '0'))
            }
        })

        // 6. Totais (Validador)
        const total = infNFe.total?.ICMSTot || {}
        const totals = {
            vProd: parseFloat(total.vProd || '0'),
            vDesc: parseFloat(total.vDesc || '0'),
            vNF: parseFloat(total.vNF || '0')
        }

        return {
            chNFe,
            dhEmi,
            nNF,
            supplier,
            buyer,
            items,
            totals
        }
    }
}
