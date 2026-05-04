export type JobStatus = "success" | "error" | "skipped";

export type JobExecutionSummary = {
  status: JobStatus;
  message: string;
  affected: number;
  meta?: Record<string, unknown>;
};

export type JobResult = {
  jobId: string;
  jobName: string;
  status: JobStatus;
  message: string;
  affected: number;
  durationMs: number;
  runAt: Date;
  meta?: Record<string, unknown>;
};

export type JobDefinition = {
  id: string;
  name: string;
  description: string;
  run: (prisma: any) => Promise<JobExecutionSummary>;
};

export type Job = JobDefinition;

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Erro desconhecido";
}

export async function runAllJobs(prisma: any): Promise<JobResult[]> {
  const { checkOverdueInstallments } = await import("./checkOverdueInstallments");
  const { archiveOldOrders } = await import("./archiveOldOrders");
  const { checkPrescriptionExpirations } = await import("./checkPrescriptionExpirations");
  const { abandonedCartRecovery } = await import("./abandonedCartRecovery");

  const jobs: JobDefinition[] = [
    checkOverdueInstallments,
    archiveOldOrders,
    abandonedCartRecovery,
    checkPrescriptionExpirations,
  ];

  const results: JobResult[] = [];

  for (const job of jobs) {
    const start = Date.now();

    try {
      const result = await job.run(prisma);

      results.push({
        jobId: job.id,
        jobName: job.name,
        status: result.status,
        message: result.message,
        affected: result.affected,
        durationMs: Date.now() - start,
        runAt: new Date(),
        ...(result.meta ? { meta: result.meta } : {}),
      });
    } catch (error) {
      results.push({
        jobId: job.id,
        jobName: job.name,
        status: "error",
        message: getErrorMessage(error),
        affected: 0,
        durationMs: Date.now() - start,
        runAt: new Date(),
      });
    }
  }

  return results;
}
