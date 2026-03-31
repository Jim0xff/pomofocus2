export type AppConfig = {
  port: number;
  registrationDeadlineUtc: string;
  adminInviteCode: string;
  adminTokenTtlSeconds: number;
};

export function loadConfig(): AppConfig {
  const registrationDeadlineUtc = process.env.REGISTRATION_DEADLINE_UTC ?? "";
  const adminInviteCode = process.env.ADMIN_INVITE_CODE ?? "";

  if (!registrationDeadlineUtc) {
    throw new Error("Missing required env: REGISTRATION_DEADLINE_UTC");
  }

  if (!adminInviteCode) {
    throw new Error("Missing required env: ADMIN_INVITE_CODE");
  }

  return {
    port: Number(process.env.PORT ?? 3000),
    registrationDeadlineUtc,
    adminInviteCode,
    adminTokenTtlSeconds: Number(process.env.ADMIN_TOKEN_TTL_SECONDS ?? 7200)
  };
}
