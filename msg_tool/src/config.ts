import { join } from "node:path";
import type { DecisionChannelName } from "./broker/types.js";

export interface RuntimeConfig {
  stateDir: string;
  stateFile: string;
  channel: DecisionChannelName;
  brokerPort: number;
  publicBaseUrl?: string;
  sharedSecret?: string;
  feishu?: {
    appId?: string;
    appSecret?: string;
    receiveIdType: string;
    receiveId?: string;
    verificationToken?: string;
    encryptKey?: string;
  };
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  const stateDir = env.MSG_TOOL_STATE_DIR ?? "msg_tool/.state";
  const channel = env.MSG_TOOL_CHANNEL === "feishu" ? "feishu" : "console";

  return {
    stateDir,
    stateFile: join(stateDir, "decisions.json"),
    channel,
    brokerPort: Number(env.MSG_TOOL_BROKER_PORT ?? "8787"),
    publicBaseUrl: env.MSG_TOOL_PUBLIC_BASE_URL,
    sharedSecret: env.MSG_TOOL_SHARED_SECRET,
    feishu: {
      appId: env.FEISHU_APP_ID,
      appSecret: env.FEISHU_APP_SECRET,
      receiveIdType: env.FEISHU_RECEIVE_ID_TYPE ?? "open_id",
      receiveId: env.FEISHU_RECEIVE_ID,
      verificationToken: env.FEISHU_VERIFICATION_TOKEN,
      encryptKey: env.FEISHU_ENCRYPT_KEY
    }
  };
}
