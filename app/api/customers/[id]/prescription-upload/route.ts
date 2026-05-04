import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantContext } from "@/lib/session";

const MAX_FILE_SIZE = 1_500_000;
const ALLOWED_FILE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

function toBase64(buffer: ArrayBuffer) {
  return Buffer.from(buffer).toString("base64");
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<unknown> },
) {
  let context;

  try {
    context = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = (await params) as { id: string };

  const customer = await prisma.customer.findFirst({
    where: { id, tenantId: context.tenantId },
    select: { id: true },
  });

  if (!customer) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const tasks = await prisma.agentTask.findMany({
    where: {
      tenantId: context.tenantId,
      type: "PRESCRIPTION_UPLOAD",
      payload: {
        path: ["customerId"],
        equals: id,
      },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      createdAt: true,
      completedAt: true,
      payload: true,
      result: true,
    },
  });

  const uploads = tasks.map((task) => {
    const payload = (task.payload ?? {}) as Record<string, unknown>;
    const result = (task.result ?? {}) as Record<string, unknown>;

    return {
      id: task.id,
      status: task.status,
      createdAt: task.createdAt,
      completedAt: task.completedAt,
      fileName:
        typeof payload.fileName === "string" ? payload.fileName : "Arquivo",
      mimeType: typeof payload.mimeType === "string" ? payload.mimeType : null,
      notes: typeof payload.notes === "string" ? payload.notes : null,
      dataUrl: typeof payload.dataUrl === "string" ? payload.dataUrl : null,
      reviewed: Boolean(result.handledByClinic),
    };
  });

  return NextResponse.json({ uploads });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<unknown> },
) {
  let context;

  try {
    context = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = (await params) as { id: string };

  const customer = await prisma.customer.findFirst({
    where: { id, tenantId: context.tenantId },
    select: { id: true, name: true },
  });

  if (!customer) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const notes =
    typeof formData.get("notes") === "string"
      ? String(formData.get("notes")).trim()
      : "";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo obrigatorio" }, { status: 400 });
  }

  if (!ALLOWED_FILE_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Formato nao suportado" },
      { status: 400 },
    );
  }

  if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "Arquivo excede o limite permitido" },
      { status: 400 },
    );
  }

  if (notes.length > 280) {
    return NextResponse.json(
      { error: "Observacao muito longa" },
      { status: 400 },
    );
  }

  const fileBuffer = await file.arrayBuffer();
  const dataUrl = `data:${file.type};base64,${toBase64(fileBuffer)}`;

  const task = await prisma.agentTask.create({
    data: {
      tenantId: context.tenantId,
      type: "PRESCRIPTION_UPLOAD",
      status: "PENDING",
      priority: "MEDIUM",
      payload: {
        customerId: customer.id,
        customerName: customer.name,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        notes: notes || null,
        uploadedAt: new Date().toISOString(),
        dataUrl,
      },
    },
  });

  return NextResponse.json({ ok: true, id: task.id }, { status: 201 });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<unknown> },
) {
  let context;

  try {
    context = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = (await params) as { id: string };
  const body = await req.json();
  const taskId = typeof body.taskId === "string" ? body.taskId : "";
  const action = typeof body.action === "string" ? body.action : "";

  if (!taskId || !["REVIEWED", "DISMISS"].includes(action)) {
    return NextResponse.json({ error: "Dados invalidos" }, { status: 400 });
  }

  const task = await prisma.agentTask.findFirst({
    where: {
      id: taskId,
      tenantId: context.tenantId,
      type: "PRESCRIPTION_UPLOAD",
      payload: {
        path: ["customerId"],
        equals: id,
      },
    },
  });

  if (!task) {
    return NextResponse.json(
      { error: "Anexo nao encontrado" },
      { status: 404 },
    );
  }

  await prisma.agentTask.update({
    where: { id: task.id },
    data: {
      status: action === "REVIEWED" ? "COMPLETED" : "CANCELLED",
      completedAt: new Date(),
      result: {
        handledByClinic: true,
        action,
      },
    },
  });

  return NextResponse.json({ ok: true });
}
