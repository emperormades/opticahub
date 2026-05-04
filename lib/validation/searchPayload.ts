export interface UniversalSearchQuery {
  q: string;
  limit: number;
}

function toPositiveInteger(value: string | null, fallback: number) {
  if (!value) return fallback;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export function parseUniversalSearchQuery(searchParams: URLSearchParams):
  | { success: true; data: UniversalSearchQuery }
  | { success: false; error: string } {
  const q = searchParams.get("q") || "";
  const limit = toPositiveInteger(searchParams.get("limit"), 5);

  if (limit === null) {
    return { success: false, error: "limit invalido" };
  }

  const normalizedQuery = q.trim();

  if (normalizedQuery.length < 2) {
    return { success: false, error: "q precisa ter ao menos 2 caracteres" };
  }

  return {
    success: true,
    data: {
      q: normalizedQuery,
      limit: Math.min(limit, 10),
    },
  };
}
