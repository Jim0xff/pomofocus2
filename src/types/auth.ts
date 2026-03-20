export interface AuthenticatedUser {
  token: string;
  subject: string | null;
  claims: Record<string, unknown>;
}
