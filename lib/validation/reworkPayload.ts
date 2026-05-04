import { ReworkCause } from "@prisma/client";
import { OrderReworkInput } from "@/lib/services/orderReworkService";

export function parseReworkPayload(payload: unknown):
  | { success: true; data: Omit<OrderReworkInput, "reason"> & { reason: ReworkCause } }
  | { success: false; error: string } {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { success: false, error: "Payload invalido" };
  }

  const body = payload as Record<string, unknown>;

  if (
    typeof body.reason !== "string" ||
    !Object.values(ReworkCause).includes(body.reason as ReworkCause)
  ) {
    return { success: false, error: "Motivo de retificacao invalido ou ausente" };
  }

  const itemsToRectify = Array.isArray(body.itemsToRectify)
    ? body.itemsToRectify.filter(
        (item: unknown): item is string =>
          typeof item === "string" && item.trim().length > 0,
      )
    : undefined;

  if (
    Array.isArray(body.itemsToRectify) &&
    itemsToRectify &&
    itemsToRectify.length !== body.itemsToRectify.length
  ) {
    return { success: false, error: "itemsToRectify invalido" };
  }

  return {
    success: true,
    data: {
      reason: body.reason as ReworkCause,
      notes: typeof body.notes === "string" ? body.notes : undefined,
      itemsToRectify,
    },
  };
}
