import { prisma } from '@/lib/db'

export interface InvoiceItemPayload {
    orderNumber: string
    description: string
    quantity: number
    unitPrice: number
    totalPrice: number
}

export interface InvoicePayload {
    tenantId: string
    xmlKey?: string
    invoiceNumber: string
    labName: string
    issueDate: Date
    totalAmount: number
    items: InvoiceItemPayload[]
}

/**
 * Motor de Auditoria de Laboratório (DRE Blindado)
 * Avalia linha a linha da Nota Fiscal, cruza com a Ordem de Serviço da ótica
 * e emite flags de divergência.
 */
export class LaboratoryAuditService {

    static async processInvoice(payload: InvoicePayload) {
        // 1. Cria a fatura base em estado 'PENDING_CONCILIATION'
        const invoice = await prisma.labInvoice.create({
            data: {
                tenantId: payload.tenantId,
                xmlKey: payload.xmlKey || null,
                invoiceNumber: payload.invoiceNumber,
                labName: payload.labName,
                issueDate: payload.issueDate,
                totalAmount: payload.totalAmount,
                status: 'PENDING_CONCILIATION',
                items: {
                    create: payload.items.map(item => ({
                        orderNumber: item.orderNumber,
                        description: item.description,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        totalPrice: item.totalPrice,
                        matchStatus: 'UNMATCHED',
                    }))
                }
            },
            include: { items: true }
        })

        // 2. Tenta fazer o match iterando nos itens salvos
        let allMatched = true

        for (const item of invoice.items) {
            // Se o item da NF não trouxer a OS de referência, não dá pra auditar automático
            if (!item.orderNumber) {
                allMatched = false
                continue
            }

            // Busca a Ordem de Serviço na ótica (pode bater pelo OrderNumber ou labOrderCode)
            // Considerando o happy-path: o lab usa o número da OS da loja como referência.
            const relatedOS = await prisma.serviceOrder.findFirst({
                where: {
                    tenantId: payload.tenantId,
                    orderNumber: item.orderNumber, // Ex: OS-2026-000001
                },
                include: { items: { include: { product: true } } }
            })

            if (!relatedOS) {
                await prisma.labInvoiceItem.update({
                    where: { id: item.id },
                    data: { matchStatus: 'UNMATCHED', divergenceNotes: `OS ${item.orderNumber} não encontrada no sistema.` }
                })
                allMatched = false
                continue
            }

            // 3. Regras de Glosa (Auditoria de Precisão)
            let matchStatus = 'MATCHED_OK'
            let notes: string[] = []

            // A NF informa a descrição (ex: 'Lente Multifocal Digital'). Vamos ver se a OS tem Multifocal.
            const osLensItem = relatedOS.items.find(i => i.itemType === 'LENTES')
            const lensDesign = osLensItem?.product?.lensDesign?.toUpperCase()

            const descriptionUpper = item.description.toUpperCase()

            // Exemplo da Regra de Design (se pediu simples mas veio cobrado multifocal)
            if (lensDesign === 'VISAO_SIMPLES' && (descriptionUpper.includes('MULTIFOCAL') || descriptionUpper.includes('PROGRESSIVA'))) {
                matchStatus = 'DIVERGENT_PRODUCT'
                notes.push('Divergência de Design: OS é Visão Simples, NF cobrou Multifocal.')
            }

            // Exemplo da Regra de Tratamento (se cobrou uma coloração/transitions não solicitada)
            const lensTreatment = osLensItem?.product?.lensTreatment?.toUpperCase()
            if (lensTreatment === 'NENHUM' && (descriptionUpper.includes('AR') || descriptionUpper.includes('BLUE') || descriptionUpper.includes('FOTOCROM'))) {
                matchStatus = 'DIVERGENT_PRODUCT'
                notes.push('Divergência de Tratamento: OS não tem tratamentos, mas NF inclui adicional.')
            }

            // Verifica se o preço na NF assusta (aqui deveria cruzar com tabela acordada, faremos um check basico)
            // ex: total na nf >= total pago na lente
            /* 
            if (item.totalPrice >= Number(osLensItem?.unitCostAtSale || osLensItem?.unitPrice || 0)) {
                matchStatus = 'DIVERGENT_PRICE'
                notes.push('Divergência de Preço: Custo laboratório está maior/igual ao preço final da lente.')
            }
            */

            await prisma.labInvoiceItem.update({
                where: { id: item.id },
                data: {
                    linkedOrderId: relatedOS.id,
                    matchStatus,
                    divergenceNotes: notes.length > 0 ? notes.join(' | ') : null
                }
            })

            // Salva o custo no LabCost da OS para aparecer lá no DRE também, caso tenha passado!
            if (matchStatus === 'MATCHED_OK') {
                const currentLabCost = Number(relatedOS.labCost || 0)
                await prisma.serviceOrder.update({
                    where: { id: relatedOS.id },
                    data: { labCost: currentLabCost + Number(item.totalPrice) }
                })
            } else {
                allMatched = false
            }
        }

        // 4. Se a nota inteira passou sem ressalvas, ela é homologada auto.
        if (allMatched && invoice.items.length > 0) {
            await prisma.labInvoice.update({
                where: { id: invoice.id },
                data: { status: 'CONCILIATED' }
            })
        } else {
            await prisma.labInvoice.update({
                where: { id: invoice.id },
                data: { status: 'DIVERGENT' }
            })
        }

        return invoice.id
    }
}
