import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config/env";

describe("config required check", () => {
  it("throws when REGISTRATION_DEADLINE_UTC is missing", () => {
    const prevDeadline = process.env.REGISTRATION_DEADLINE_UTC;
    const prevInvite = process.env.ADMIN_INVITE_CODE;
    process.env.REGISTRATION_DEADLINE_UTC = "";
    process.env.ADMIN_INVITE_CODE = "HACK-2026-ADMIN";

    expect(() => loadConfig()).toThrowError("Missing required env: REGISTRATION_DEADLINE_UTC");

    process.env.REGISTRATION_DEADLINE_UTC = prevDeadline;
    process.env.ADMIN_INVITE_CODE = prevInvite;
  });

  it("throws when ADMIN_INVITE_CODE is missing", () => {
    const prevDeadline = process.env.REGISTRATION_DEADLINE_UTC;
    const prevInvite = process.env.ADMIN_INVITE_CODE;
    process.env.REGISTRATION_DEADLINE_UTC = "2099-01-01T00:00:00.000Z";
    process.env.ADMIN_INVITE_CODE = "";

    expect(() => loadConfig()).toThrowError("Missing required env: ADMIN_INVITE_CODE");

    process.env.REGISTRATION_DEADLINE_UTC = prevDeadline;
    process.env.ADMIN_INVITE_CODE = prevInvite;
  });
});
