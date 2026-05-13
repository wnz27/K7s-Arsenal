import type { DecisionRequest } from "../broker/types.js";
import { signActionToken } from "../security/actionToken.js";
import { redactSecrets } from "../security/redact.js";
import type { DecisionChannel } from "./types.js";

interface FeishuChannelOptions {
  appId: string;
  appSecret: string;
  receiveIdType: string;
  receiveId: string;
  sharedSecret: string;
  fetchImpl?: typeof fetch;
}

interface TokenCache {
  token: string;
  expiresAt: number;
}

export class FeishuDecisionChannel implements DecisionChannel {
  readonly name = "feishu" as const;
  private tokenCache?: TokenCache;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: FeishuChannelOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async send(decision: DecisionRequest): Promise<{ message_ref?: string }> {
    const result = await this.sendInteractiveCard({
      receiveIdType: this.options.receiveIdType,
      receiveId: this.options.receiveId,
      card: buildDecisionCard(decision, this.options.sharedSecret)
    });

    return { message_ref: result.messageId };
  }

  async getTenantAccessToken(): Promise<string> {
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now()) {
      return this.tokenCache.token;
    }

    const response = await this.fetchImpl(
      "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app_id: this.options.appId,
          app_secret: this.options.appSecret
        })
      }
    );
    const json = (await response.json()) as {
      code?: number;
      msg?: string;
      tenant_access_token?: string;
      expire?: number;
    };

    if (!response.ok || json.code !== 0 || !json.tenant_access_token) {
      throw new Error(
        redactSecrets(`Feishu token request failed: code=${json.code} msg=${json.msg}`)
      );
    }

    this.tokenCache = {
      token: json.tenant_access_token,
      expiresAt: Date.now() + Math.max(0, (json.expire ?? 0) - 60) * 1000
    };
    return json.tenant_access_token;
  }

  async sendInteractiveCard(input: {
    receiveIdType: string;
    receiveId: string;
    card: Record<string, unknown>;
  }): Promise<{ messageId: string }> {
    const token = await this.getTenantAccessToken();
    const url = `https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=${encodeURIComponent(
      input.receiveIdType
    )}`;
    const response = await this.fetchImpl(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        receive_id: input.receiveId,
        msg_type: "interactive",
        content: JSON.stringify(input.card)
      })
    });
    const json = (await response.json()) as { code?: number; msg?: string; data?: { message_id?: string } };

    if (!response.ok || json.code !== 0 || !json.data?.message_id) {
      throw new Error(redactSecrets(`Feishu card send failed: code=${json.code} msg=${json.msg}`));
    }

    return { messageId: json.data.message_id };
  }
}

function buildDecisionCard(decision: DecisionRequest, sharedSecret: string): Record<string, unknown> {
  return {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: "plain_text", content: `Decision required: ${decision.project}` },
      template: decision.priority === "urgent" ? "red" : "blue"
    },
    elements: [
      { tag: "markdown", content: `**Question**\n${decision.question}` },
      { tag: "markdown", content: `**Context**\n${decision.context ?? "No extra context."}` },
      { tag: "markdown", content: `**Expires**\n${decision.expires_at}` },
      {
        tag: "action",
        actions: decision.options.map((option) => ({
          tag: "button",
          text: { tag: "plain_text", content: option.label },
          type: option.id === decision.recommended_option_id ? "primary" : "default",
          value: {
            action_token: signActionToken(
              {
                request_id: decision.request_id,
                option_id: option.id,
                expires_at: decision.expires_at
              },
              sharedSecret
            )
          }
        }))
      }
    ]
  };
}
