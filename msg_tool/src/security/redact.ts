const SECRET_ASSIGNMENT =
  /\b(FEISHU_APP_SECRET|MSG_TOOL_SHARED_SECRET|[A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|KEY)[A-Z0-9_]*)=([^\s]+)/gi;
const BEARER = /(Authorization:\s*Bearer\s+)([A-Za-z0-9._~+/-]+)/gi;
const LONG_SECRET_FIELD = /\b(secret|token|password|key)\b([^,\n:]*[:=]\s*)([^\s,]{200,})/gi;

export function redactSecrets(input: string): string {
  return input
    .replace(SECRET_ASSIGNMENT, "$1=[REDACTED]")
    .replace(BEARER, "$1[REDACTED]")
    .replace(LONG_SECRET_FIELD, "$1$2[REDACTED]");
}
