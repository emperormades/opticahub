import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { logChange } from '@/lib/audit'
import { AppError, ERR_XML_INVALID } from '@/lib/errors'
import { ParsedItem, ParsedXML, XMLImporter } from '@/lib/services/xmlImporter'

export interface ParsedNfeItem {
  nItem: number
  cProd: string
  cEAN: string | null
  xProd: string
  qCom: number
  vUnCom: number
}

export interface ImportPreviewItem extends ParsedItem {
  productId: string | null
  matchStatus: 'FOUND' | 'NEW'
  currentStock: number
  suggestedPrice: number
}

export interface ImportPreviewResult extends ParsedXML {
  items: ImportPreviewItem[]
}

export interface ConfirmImportItem {
  productId?: string | null
  cProd: string
  cEAN?: string | null
  xProd: string
  qCom: number
  vUnCom: number
  salePrice?: number | null
}

export interface ConfirmImportPayload {
  parsedData: ParsedXML
  itemsToImport: ConfirmImportItem[]
}

function normalizeImportedBarcode(value: string | null | undefined) {
  if (!value || value === 'SEM GTIN') {
    return null
  }

  return value.trim()
}

function toDecimal(value: number) {
  return new Prisma.Decimal(value)
}

function buildImportKey(item: { cProd: string; xProd: string }) {
  return `${item.cProd.trim()}::${item.xProd.trim().toLowerCase()}`
}

export class StockImportService {
  static parseNfeXml(xml: string): ParsedXML {
    if (!xml || !xml.trim()) {
      throw new AppError('XML_INVÁLIDO', ERR_XML_INVALID, 400)
    }

    let parsed: ParsedXML

    try {
      parsed = XMLImporter.parseNFe(xml)
    } catch {
      throw new AppError('XML_INVÁLIDO', ERR_XML_INVALID, 400)
    }

    const items = parsed.items.map((item) => this.mapParsedNfeItem(item))

    if (items.length === 0) {
      throw new AppError('XML_INVÁLIDO', ERR_XML_INVALID, 400)
    }

    return {
      ...parsed,
      items: parsed.items.map((item, index) => ({
        ...item,
        cEAN: items[index].cEAN || '',
        xProd: items[index].xProd,
        cProd: items[index].cProd,
        qCom: items[index].qCom,
        vUnCom: items[index].vUnCom,
      })),
    }
  }

  static async buildPreview(tenantId: string, xml: string): Promise<ImportPreviewResult> {
    const parsed = this.parseNfeXml(xml)

    const items = await Promise.all(
      parsed.items.map(async (item) => {
        const barcode = normalizeImportedBarcode(item.cEAN)
        const orFilters: Prisma.ProductWhereInput[] = barcode
          ? [{ barcode }, { supplierCode: item.cProd }]
          : [{ supplierCode: item.cProd }]

        const existingProduct = await prisma.product.findFirst({
          where: {
            tenantId,
            OR: orFilters,
          },
          include: { stockItems: true },
        })

        return {
          ...item,
          productId: existingProduct?.id || null,
          matchStatus: existingProduct ? ('FOUND' as const) : ('NEW' as const),
          currentStock: existingProduct?.stockItems[0]?.quantity || 0,
          suggestedPrice: existingProduct?.salePrice
            ? Number(existingProduct.salePrice)
            : item.vUnCom * 2,
        }
      }),
    )

    return {
      ...parsed,
      items,
    }
  }

  static async confirmImport(
    tenantId: string,
    userId: string,
    payload: ConfirmImportPayload,
  ) {
    return this.applyStockImport(tenantId, userId, payload)
  }

  static async applyStockImport(
    tenantId: string,
    userId: string,
    payload: ConfirmImportPayload,
  ) {
    if (!payload?.parsedData || !Array.isArray(payload.itemsToImport) || payload.itemsToImport.length === 0) {
      throw new AppError('Payload de importação inválido.', ERR_XML_INVALID, 400)
    }

    const normalizedParsed = {
      ...payload.parsedData,
      items: payload.parsedData.items.map((item) => ({
        ...item,
        ...this.mapParsedNfeItem(item),
      })),
    }

    const parsedItemsByKey = new Map(
      normalizedParsed.items.map((item) => [buildImportKey(item), item]),
    )

    const normalizedItemsToImport = payload.itemsToImport.map((item) => {
      const normalizedItem = this.mapParsedNfeItem(item)
      const matchedParsedItem = parsedItemsByKey.get(buildImportKey(normalizedItem))

      if (!matchedParsedItem) {
        throw new AppError(
          `Item da revisão não confere com o XML original: ${normalizedItem.xProd}`,
          ERR_XML_INVALID,
          400,
        )
      }

      return {
        ...item,
        ...normalizedItem,
      }
    })

    const linkedProductIds = normalizedItemsToImport
      .map((item) => item.productId || null)
      .filter((productId): productId is string => Boolean(productId))

    const defaultCategory = await prisma.productCategory.findFirst({
      where: { tenantId },
      select: { id: true },
    })

    return prisma.$transaction(async (tx) => {
      const existingProducts = linkedProductIds.length > 0
        ? await tx.product.findMany({
            where: {
              tenantId,
              id: { in: linkedProductIds },
            },
            select: { id: true },
          })
        : []

      if (existingProducts.length !== new Set(linkedProductIds).size) {
        throw new AppError(
          'Há produtos vinculados fora do tenant da sessão.',
          'TENANT_SCOPE_VIOLATION',
          400,
        )
      }

      const allowedProductIds = new Set(existingProducts.map((product) => product.id))

      for (const item of normalizedItemsToImport) {
        let productId = item.productId || null

        if (!productId) {
          if (!defaultCategory) {
            throw new AppError(
              'Nenhuma categoria de produto cadastrada para importar novos itens.',
              'DEFAULT_CATEGORY_MISSING',
              400,
            )
          }

          const newProduct = await tx.product.create({
            data: {
              tenantId,
              name: item.xProd,
              sku: `IMP-${item.cProd}`,
              barcode: normalizeImportedBarcode(item.cEAN),
              supplierCode: item.cProd,
              costPrice: toDecimal(item.vUnCom),
              salePrice: toDecimal(item.salePrice || item.vUnCom * 2),
              isActive: true,
              categoryId: defaultCategory.id,
            },
            select: { id: true },
          })

          productId = newProduct.id
          allowedProductIds.add(productId)
        } else {
          if (!allowedProductIds.has(productId)) {
            throw new AppError(
              'Há produtos vinculados fora do tenant da sessão.',
              'TENANT_SCOPE_VIOLATION',
              400,
            )
          }

          await tx.product.update({
            where: { id: productId },
            data: { costPrice: toDecimal(item.vUnCom) },
          })
        }

        await tx.stockItem.upsert({
          where: { tenantId_productId: { tenantId, productId } },
          update: {
            quantity: { increment: item.qCom },
          },
          create: {
            tenantId,
            productId,
            quantity: item.qCom,
            minStock: 0,
          },
        })

        await logChange({
          tenantId,
          userId,
          entityType: 'StockItem',
          entityId: productId,
          action: 'RESTOCK_NFE',
          field: 'quantity',
          db: tx,
          newValue: {
            nfeNumber: normalizedParsed.nNF,
            supplier: normalizedParsed.supplier.xNome,
            quantityAdded: item.qCom,
            unitCost: item.vUnCom,
            supplierCode: item.cProd,
          },
        })
      }

      await tx.accountsPayable.create({
        data: {
          tenantId,
          createdById: userId,
          description: `NF-e ${normalizedParsed.nNF} - Fornecedor: ${normalizedParsed.supplier.xNome}`,
          supplier: normalizedParsed.supplier.xNome,
          amount: toDecimal(normalizedParsed.totals.vNF),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          isPaid: false,
          category: 'FORNECEDOR',
          notes: `Chave: ${normalizedParsed.chNFe}`,
        },
      })

      return { success: true }
    })
  }

  private static mapParsedNfeItem(item: {
    nItem?: number
    cProd?: string
    cEAN?: string | null
    xProd?: string
    qCom?: number
    vUnCom?: number
  }): ParsedNfeItem {
    const mapped: ParsedNfeItem = {
      nItem: Number(item.nItem || 0),
      cProd: String(item.cProd || '').trim(),
      cEAN: normalizeImportedBarcode(item.cEAN),
      xProd: String(item.xProd || '').trim(),
      qCom: Number(item.qCom || 0),
      vUnCom: Number(item.vUnCom || 0),
    }

    const isInvalid =
      !mapped.cProd ||
      !mapped.xProd ||
      !Number.isFinite(mapped.qCom) ||
      mapped.qCom <= 0 ||
      !Number.isFinite(mapped.vUnCom) ||
      mapped.vUnCom <= 0

    if (isInvalid) {
      throw new AppError('XML_INVÁLIDO', ERR_XML_INVALID, 400)
    }

    return mapped
  }
}
