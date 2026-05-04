export interface AnalyticsRangeQuery {
  days: number;
}

export interface SellerAnalyticsQuery {
  period: "thisMonth" | "lastMonth" | "thisYear";
}

export interface MonthlyAnalyticsQuery {
  month: number;
  year: number;
}

function toPositiveInteger(value: string | null): number | null {
  if (!value || value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export function parseAnalyticsRangeQuery(searchParams: URLSearchParams):
  | { success: true; data: AnalyticsRangeQuery }
  | { success: false; error: string } {
  const rangeParam = searchParams.get("range");
  const days = rangeParam === null ? 30 : toPositiveInteger(rangeParam);

  if (days === null || days > 365) {
    return { success: false, error: "range invalido" };
  }

  return {
    success: true,
    data: { days },
  };
}

export function parseSellerAnalyticsQuery(searchParams: URLSearchParams):
  | { success: true; data: SellerAnalyticsQuery }
  | { success: false; error: string } {
  const period = searchParams.get("period") || "thisMonth";

  if (period !== "thisMonth" && period !== "lastMonth" && period !== "thisYear") {
    return { success: false, error: "period invalido" };
  }

  return {
    success: true,
    data: { period },
  };
}

export function parseMonthlyAnalyticsQuery(searchParams: URLSearchParams):
  | { success: true; data: MonthlyAnalyticsQuery }
  | { success: false; error: string } {
  const now = new Date();
  const monthValue = searchParams.get("month") || String(now.getMonth() + 1);
  const yearValue = searchParams.get("year") || String(now.getFullYear());

  const month = Number(monthValue);
  const year = Number(yearValue);

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return { success: false, error: "month invalido" };
  }

  if (!Number.isInteger(year) || year < 2000 || year > 3000) {
    return { success: false, error: "year invalido" };
  }

  return {
    success: true,
    data: { month, year },
  };
}
