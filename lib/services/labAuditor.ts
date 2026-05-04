import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { parseNFe } from "../xml/nfeParser";

type LabConciliationResult =
  | {
      success: true;
      invoiceId: string;
      divergent: boolean;
      itemCount: number;
    }
  | {
      success: false;
      error: string;
    };

export class LabAuditor {
  static async conciliate(
    xmlString: string,
    tenantId: string,
  ): Promise<LabConciliationResult> {
    try {
      const nfe = parseNFe(xmlString);

      const invoice = await prisma.labInvoice.create({
        data: {
          tenantId,
          invoiceNumber: nfe.docNumber || "S/N",
          labName: nfe.supplierName || "Laboratorio desconhecido",
          issueDate: nfe.issueDate ? new Date(nfe.issueDate) : new Date(),
          totalAmount: nfe.totalValue,
          status: "PENDING_CONCILIATION",
        },
      });

      const itemsToCreate: Prisma.LabInvoiceItemCreateManyInput[] = [];

      for (const product of nfe.products) {
        let matchStatus = "UNMATCHED";
        let divergenceNotes: string | null = null;
        let linkedOrderId: string | null = null;

        const orderRef =
          product.orderNumber ||
          this.extractOSRef(`${product.description} ${product.infAdProd || ""}`);

        if (orderRef) {
          const order = await prisma.serviceOrder.findFirst({
            where: { tenantId, orderNumber: orderRef.trim() },
            select: { id: true, labCost: true },
          });

          if (order) {
            linkedOrderId = order.id;
            matchStatus = "MATCHED_OK";

            const expectedCost = Number(order.labCost || 0);
            if (
              expectedCost > 0 &&
              Math.abs(product.unitValue - expectedCost) > 0.1
            ) {
              matchStatus = "DIVERGENT_PRICE";
              divergenceNotes =
                `Preco Lab (R$ ${product.unitValue.toFixed(2)}) divergente do custo OS ` +
                `(R$ ${expectedCost.toFixed(2)})`;
            }
          }
        }

        itemsToCreate.push({
          invoiceId: invoice.id,
          orderNumber: orderRef || null,
          linkedOrderId,
          description: product.description,
          quantity: product.quantity,
          unitPrice: product.unitValue,
          totalPrice: product.totalValue,
          matchStatus,
          divergenceNotes,
        });
      }

      if (itemsToCreate.length > 0) {
        await prisma.labInvoiceItem.createMany({ data: itemsToCreate });
      }

      const anyDivergent = itemsToCreate.some(
        (item) =>
          item.matchStatus === "DIVERGENT_PRICE" || item.matchStatus === "UNMATCHED",
      );

      await prisma.labInvoice.update({
        where: { id: invoice.id },
        data: {
          status: anyDivergent ? "DIVERGENT" : "CONCILIATED",
        },
      });

      return {
        success: true,
        invoiceId: invoice.id,
        divergent: anyDivergent,
        itemCount: nfe.products.length,
      };
    } catch (error) {
      console.error("[LabAuditor] Erro na conciliacao:", error);

      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      };
    }
  }

  private static extractOSRef(text: string): string | null {
    const match = text.match(/OS-\d{4}-\d+/);
    return match ? match[0] : null;
  }
}
