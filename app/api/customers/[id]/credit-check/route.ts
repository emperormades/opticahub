import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { CreditChecker } from "@/lib/credit/checker";
import { decryptOptionalPii } from "@/lib/pii";
import { requireTenantContext } from "@/lib/session";

function toPositiveFiniteNumber(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return fallback;
}

// POST /api/customers/[id]/credit-check
// Body: { requestedAmount? }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let context;

  try {
    context = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const requestedAmount = toPositiveFiniteNumber(body.requestedAmount, 1000);

  const customer = await prisma.customer.findFirst({
    where: { id, tenantId: context.tenantId },
    select: {
      id: true,
      name: true,
      cpf: true,
      creditScore: true,
      creditLimit: true,
      lastCreditCheck: true,
    },
  });

  if (!customer) {
    return NextResponse.json(
      { error: "Cliente nao encontrado" },
      { status: 404 },
    );
  }

  const rawCpf = decryptOptionalPii(customer.cpf);
  if (!rawCpf) {
    return NextResponse.json(
      {
        error:
          "Cliente sem CPF cadastrado. CPF e obrigatorio para analise de credito.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await CreditChecker.check(rawCpf, requestedAmount);

    await prisma.customer.update({
      where: { id },
      data: {
        creditScore: result.score,
        creditLimit: result.limit,
        lastCreditCheck: result.checkedAt,
      },
    });

    return NextResponse.json({
      ...result,
      customer: { id: customer.id, name: customer.name },
      visual: CreditChecker.getScoreVisual(result.score),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Erro ao consultar credito",
      },
      { status: 400 },
    );
  }
}

// GET /api/customers/[id]/credit-check - retorna o score atual salvo
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let context;

  try {
    context = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const customer = await prisma.customer.findFirst({
    where: { id, tenantId: context.tenantId },
    select: {
      id: true,
      name: true,
      creditScore: true,
      creditLimit: true,
      creditUsed: true,
      lastCreditCheck: true,
    },
  });

  if (!customer)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const visual =
    customer.creditScore != null
      ? CreditChecker.getScoreVisual(customer.creditScore)
      : null;

  return NextResponse.json({ ...customer, visual });
}
