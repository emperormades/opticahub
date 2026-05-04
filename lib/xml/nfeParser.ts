// lib/xml/nfeParser.ts
// Parser de Nota Fiscal Eletrônica (NF-e) formato ABNT NBR 15415
// Extrai produtos, quantidades, preços e códigos de fornecedor

export interface NFeProduct {
    supplierCode: string   // cProd — código do produto no fornecedor
    ean: string | null      // cEAN — código de barras
    description: string    // xProd — descrição
    ncm: string | null      // NCM para tributação
    unitValue: number      // vUnCom — valor unitário de compra
    quantity: number       // qCom — quantidade
    totalValue: number     // vProd — valor total do item
    unit: string           // uCom — unidade (UN, PC, CX...)
    orderNumber: string | null // xPed — pedido de origem (Usado para conciliação automática)
    infAdProd: string | null    // infAdProd — informações adicionais do produto
}

export interface NFeResult {
    docNumber: string        // nNF — número da nota
    issueDate: string        // dhEmi
    supplierName: string     // razão social do emitente
    supplierCnpj: string     // CNPJ do emitente
    totalValue: number       // total da NF-e
    products: NFeProduct[]
}

/**
 * Parseia o XML de uma NF-e e extrai os dados relevantes para o estoque.
 * Compatível com: NF-e padrão (nfeProc), CTe, nota do SEFAZ.
 */
export function parseNFe(xmlString: string): NFeResult {
    // Parser leve sem dependências externas — usa DOM nativo (disponível no Node via regex)
    const tag = (xml: string, tagName: string): string => {
        const match = xml.match(new RegExp(`<${tagName}[^>]*>([^<]*)<\/${tagName}>`))
        return match ? match[1].trim() : ''
    }

    const allTags = (xml: string, tagName: string): string[] => {
        const results: string[] = []
        const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\/${tagName}>`, 'g')
        let m
        while ((m = regex.exec(xml)) !== null) {
            results.push(m[1])
        }
        return results
    }

    // Dados da nota
    const ide = xmlString.match(/<ide>([\s\S]*?)<\/ide>/)?.[1] || ''
    const emit = xmlString.match(/<emit>([\s\S]*?)<\/emit>/)?.[1] || ''
    const total = xmlString.match(/<total>([\s\S]*?)<\/total>/)?.[1] || ''

    const docNumber = tag(ide, 'nNF') || tag(xmlString, 'nNF')
    const issueDate = tag(ide, 'dhEmi') || tag(xmlString, 'dhEmi') || tag(xmlString, 'dEmi')
    const supplierName = tag(emit, 'xNome') || tag(xmlString, 'xNome')
    const supplierCnpj = tag(emit, 'CNPJ') || tag(xmlString, 'CNPJ')
    const totalValue = parseFloat(tag(total, 'vNF') || tag(xmlString, 'vNF') || '0')

    // Produtos (itens det)
    const detBlocks = allTags(xmlString, 'det')
    const products: NFeProduct[] = detBlocks.map(det => {
        const prod = det.match(/<prod>([\s\S]*?)<\/prod>/)?.[1] || det
        return {
            supplierCode: tag(prod, 'cProd'),
            ean: tag(prod, 'cEAN') || null,
            description: tag(prod, 'xProd'),
            ncm: tag(prod, 'NCM') || null,
            quantity: parseFloat(tag(prod, 'qCom') || '1'),
            unitValue: parseFloat(tag(prod, 'vUnCom') || '0'),
            totalValue: parseFloat(tag(prod, 'vProd') || '0'),
            unit: tag(prod, 'uCom') || 'UN',
            orderNumber: tag(prod, 'xPed') || null,
            infAdProd: tag(det, 'infAdProd') || null,
        }
    })

    if (!docNumber && products.length === 0) {
        throw new Error('XML inválido: não foi possível identificar uma NF-e válida. Verifique se o arquivo é um XML de NF-e padrão.')
    }

    return { docNumber, issueDate, supplierName, supplierCnpj, totalValue, products }
}
