import { createHmac, timingSafeEqual } from "node:crypto";

export interface ActionTokenPayload {
  request_id: string;
  option_id: string;
  expires_at: string;
}

export function signActionToken(payload: ActionTokenPayload, secret: string): string {
  if (!secret) {
    throw new Error("MSG_TOOL_SHARED_SECRET is required to sign action tokens");
  }
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = hmac(body, secret);
  return `${body}.${signature}`;
}

export function verifyActionToken(token: string, secret: string): ActionTokenPayload {
  if (!secret) {
    throw new Error("MSG_TOOL_SHARED_SECRET is required to verify action tokens");
  }
  const [body, signature] = token.split(".");
  if (!body || !signature) {
    throw new Error("Malformed action token");
  }

  const expected = hmac(body, secret);
  if (!safeEqual(signature, expected)) {
    throw new Error("Invalid action token signature");
  }

  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as ActionTokenPayload;
  if (Date.parse(payload.expires_at) <= Date.now()) {
    throw new Error("Action token expired");
  }

  return payload;
}

function hmac(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
