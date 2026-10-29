import { getToken } from "@vercel/connect";
import { connectSlackCredentials } from "@vercel/connect/eve";
import { slackChannel } from "eve/channels/slack";

// Which Vercel Connect connector to use (set in Vercel as SLACK_CONNECTOR).
const CONNECTOR = process.env.SLACK_CONNECTOR ?? "slack/rev-coach";

// The standard helper verifies incoming Slack events, but it always replies
// with the connector's default installation. We keep its verification and
// pick the bot token for the workspace the message came from, so every
// Slack workspace that installs Rev Coach gets replies from its own install.
const base = connectSlackCredentials(CONNECTOR);

type TokenContext = { teamId?: string } | undefined;

// Some calls (like the typing indicator) don't say which workspace they're
// for. Those fall back to the standard default token.
async function defaultToken(ctx: TokenContext): Promise<string> {
  const fallback = (base as { botToken?: unknown }).botToken;
  if (typeof fallback === "function") return fallback(ctx ?? {});
  return fallback as string;
}

export default slackChannel({
  credentials: {
    ...base,
    botToken: async (ctx?: { teamId?: string }) => {
      const teamId = ctx?.teamId;
      if (!teamId) {
        console.log("[rev-coach] token request with NO workspace -> using default");
        return defaultToken(ctx);
      }
      console.log(`[rev-coach] token request for workspace ${teamId}`);

      const result: unknown = await getToken(CONNECTOR, {
        subject: { type: "app" },
        installationId: teamId,
      });
      if (typeof result === "string") return result;
      const token =
        (result as { token?: string; accessToken?: string })?.token ??
        (result as { token?: string; accessToken?: string })?.accessToken;
      if (!token) {
        throw new Error(`No Slack token returned for workspace ${teamId}.`);
      }
      return token;
    },
  },
});
