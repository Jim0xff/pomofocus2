import { createHash, randomBytes } from "crypto";
import { insertAdminAccessToken, existsValidAdminAccessToken } from "../repositories/adminAccessTokenRepository";
import { HttpError } from "../utils/httpError";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function verifyInviteAndIssueToken(inviteCode: string, expectedInviteCode: string, tokenTtlSeconds: number) {
  if (inviteCode.trim() !== expectedInviteCode) {
    throw new HttpError(401, "INVALID_INVITE_CODE", "invite code is invalid", { reason: "mismatch" });
  }

  const plainToken = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + tokenTtlSeconds * 1000).toISOString();
  await insertAdminAccessToken(sha256(plainToken), expiresAt);

  return {
    accessToken: plainToken,
    tokenType: "Bearer",
    expiresAt
  };
}

export async function validateAccessToken(token: string): Promise<boolean> {
  if (!token) {
    return false;
  }
  return existsValidAdminAccessToken(sha256(token));
}
