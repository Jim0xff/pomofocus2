export type ApiError = Error & { status?: number; code?: string; detail?: unknown };
