import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateCronRequest } from "@/lib/cron";
import { runAllJobs } from "@/lib/jobs/runner";

// POST /api/jobs/run
// Protegido por CRON_SECRET para ser chamado pelo Vercel Cron ou qualquer scheduler externo
export async function POST(req: NextRequest) {
  const auth = validateCronRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const startAt = Date.now();
  const results = await runAllJobs(prisma);

  const summary = {
    totalJobs: results.length,
    success: results.filter((r) => r.status === "success").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    errors: results.filter((r) => r.status === "error").length,
    totalDuration: Date.now() - startAt,
    ranAt: new Date(),
    results,
  };

  console.log("[JOBS]", JSON.stringify(summary, null, 2));

  return NextResponse.json(summary);
}

// GET /api/jobs/run
export async function GET(req: NextRequest) {
  const auth = validateCronRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  return NextResponse.json({
    status: "ok",
    message: "Job runner ativo. Use POST para executar.",
  });
}
