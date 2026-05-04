import { Prisma, Product, ProductType } from "@prisma/client";
import { prisma } from "../db";
import { CreateOrderItemInput } from "./orderService";

type AutomatedFeeItem = Required<
  Pick<CreateOrderItemInput, "description" | "quantity" | "unitPrice" | "discount" | "itemType">
> &
  Pick<CreateOrderItemInput, "productId">;

function isSpecialMountFrame(product: Product) {
  const material = product.frameMaterial?.toUpperCase() || "";
  return material.includes("NYLON") || material.includes("PARAFUSADA") || material.includes("BALGRIFF");
}

export class BillingEngine {
  /**
   * Avalia os itens da OS e adiciona taxas automaticas de montagem e tratamentos especiais.
   */
  static async generateAutomatedFees(
    tenantId: string,
    items: CreateOrderItemInput[],
  ): Promise<AutomatedFeeItem[]> {
    const automatedFees: AutomatedFeeItem[] = [];

    const productIds = items
      .map((item) => item.productId)
      .filter((productId): productId is string => Boolean(productId));

    const products =
      productIds.length > 0
        ? await prisma.product.findMany({
            where: { id: { in: productIds }, tenantId },
          })
        : [];

    const productsById = new Map(products.map((product) => [product.id, product]));

    let isSpecialMount = false;
    let hasLens = false;
    let requiresSpecialTreatment = false;

    for (const item of items) {
      if (item.itemType === ProductType.LENTES) {
        hasLens = true;
      }

      if (!item.productId) {
        continue;
      }

      const product = productsById.get(item.productId);
      if (!product) {
        continue;
      }

      if (isSpecialMountFrame(product)) {
        isSpecialMount = true;
      }

      if (
        product.lensTreatment === "AR_FOTOCROMICO" ||
        product.lensTreatment === "FOTOCROMICO"
      ) {
        requiresSpecialTreatment = true;
      }

      const productName = product.name.toLowerCase();
      if (productName.includes("colorida") || productName.includes("solar")) {
        requiresSpecialTreatment = true;
      }
    }

    if (hasLens) {
      const unitPrice = isSpecialMount ? 75 : 35;
      const description = isSpecialMount
        ? "Taxa de Montagem Especial (Nylon/Balgriff)"
        : "Taxa de Montagem Padrao (Laboratorio)";

      automatedFees.push({
        description,
        quantity: 1,
        unitPrice,
        discount: 0,
        itemType: ProductType.SERVICOS,
        productId: undefined,
      });
    }

    if (requiresSpecialTreatment) {
      automatedFees.push({
        description: "Adicional de Laboratorio (Coloracao / Trat. Especial)",
        quantity: 1,
        unitPrice: 45,
        discount: 0,
        itemType: ProductType.SERVICOS,
        productId: undefined,
      });
    }

    return automatedFees;
  }
}
