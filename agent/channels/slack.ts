import { getToken } from "@vercel/connect";
import { connectSlackCredentials } from "@vercel/connect/eve";
import { slackChannel } from "eve/channels/slack";

// Which Vercel Connect connector to use (set in Vercel as SLACK_CONNECTOR).
const CONNECTOR = process.env.SLACK_CONNECTOR ?? "slack/rev-coach";

// The standard helper verifies incoming Slack events, but it always replies
// with the connector's default installation. We keep its verification and
// swap in a bot token chosen per workspace, so every Slack workspace that
// installs Rev Coach gets replies from its own installation.
const base = connectSlackCredentials(CONNECTOR);

export default slackChannel({
  credentials: {
    ...base,
    botToken: async ({ teamId }: { teamId?: string }) => {
      if (!teamId) {
        throw new Error("Slack event did not include a workspace ID.");
      }
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
