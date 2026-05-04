import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";

const ALLOWED_PERIODS = new Set(["MORNING", "AFTERNOON", "EVENING"]);

export async function POST(req: NextRequest) {
  try {
    const forwardedFor = req.headers.get("x-forwarded-for") || "unknown";
    const ipAddress = forwardedFor.split(",")[0]?.trim() || "unknown";
    const rateLimit = checkRateLimit(`public-schedule:${ipAddress}`, 5, 60_000);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Muitas tentativas. Tente novamente em instantes." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)),
          },
        },
      );
    }

    const body = await req.json();
    const tenantSlug =
      typeof body.tenantSlug === "string"
        ? body.tenantSlug.trim().toLowerCase()
        : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";
    const preferredPeriod =
      typeof body.preferredPeriod === "string"
        ? body.preferredPeriod.trim().toUpperCase()
        : "";
    const requestedDate =
      typeof body.date === "string" ? new Date(body.date) : new Date("invalid");
    const now = new Date();
    const minLeadTime = new Date(now.getTime() + 60 * 60 * 1000);
    const maxSchedulingWindow = new Date(
      now.getTime() + 90 * 24 * 60 * 60 * 1000,
    );

    if (
      !tenantSlug ||
      name.length < 3 ||
      name.length > 120 ||
      phone.length < 8 ||
      Number.isNaN(requestedDate.getTime()) ||
      requestedDate < minLeadTime ||
      requestedDate > maxSchedulingWindow ||
      notes.length > 280 ||
      (preferredPeriod && !ALLOWED_PERIODS.has(preferredPeriod))
    ) {
      return NextResponse.json({ error: "Dados invalidos" }, { status: 400 });
    }

    const tenant = await prisma.tenant.findFirst({
      where: {
        slug: tenantSlug,
        isActive: true,
      },
      select: { id: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Loja indisponivel" }, { status: 404 });
    }

    await prisma.agentTask.create({
      data: {
        tenantId: tenant.id,
        type: "AGENDAMENTO_WEB",
        status: "PENDING",
        priority: "HIGH",
        payload: {
          leadName: name,
          leadPhone: phone,
          requestedDate: requestedDate.toISOString(),
          preferredPeriod: preferredPeriod || null,
          notes: notes || null,
          source: "Link_Publico_Web",
          ipAddress,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Agendamento pre-reservado com sucesso.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao processar agendamento",
      },
      { status: 500 },
    );
  }
}
