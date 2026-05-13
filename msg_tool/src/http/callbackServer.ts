import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import type { DecisionBroker } from "../broker/broker.js";
import { verifyActionToken } from "../security/actionToken.js";

interface CallbackServerOptions {
  broker: DecisionBroker;
  sharedSecret: string;
  verificationToken?: string;
}

interface FeishuCallbackPayload {
  token?: string;
  challenge?: string;
  type?: string;
  action?: {
    value?: {
      action_token?: string;
    };
    option?: string;
  };
}

export function createCallbackServer(options: CallbackServerOptions): FastifyInstance {
  const app = Fastify({ logger: false });

  app.get("/healthz", async () => ({ ok: true }));

  app.post<{ Body: FeishuCallbackPayload }>("/callbacks/feishu", async (request, reply) => {
    const body = request.body;

    if (options.verificationToken && body.token !== options.verificationToken) {
      return reply.code(401).send({ error: "Invalid Feishu verification token" });
    }

    if (body.challenge) {
      return { challenge: body.challenge };
    }

    const token = body.action?.value?.action_token;
    if (!token) {
      return reply.code(400).send({ error: "Missing action token" });
    }

    try {
      const payload = verifyActionToken(token, options.sharedSecret);
      await options.broker.answer(payload.request_id, payload.option_id, body.action?.option, "human");
      return { ok: true };
    } catch (error) {
      return reply.code(401).send({ error: (error as Error).message });
    }
  });

  return app;
}
