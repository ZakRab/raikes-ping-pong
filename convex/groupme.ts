/* eslint-disable no-var */
declare var process: { env: Record<string, string | undefined> };

import { internalAction } from "./_generated/server";
import { v } from "convex/values";

export const sendMessage = internalAction({
  args: { text: v.string() },
  handler: async (_ctx, args) => {
    const botId = process.env.GROUPME_BOT_ID;
    if (!botId) {
      console.log("[GroupMe] No bot ID set, skipping:", args.text);
      return;
    }

    await fetch("https://api.groupme.com/v3/bots/post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bot_id: botId, text: args.text }),
    });
  },
});

export const fetchGroupMembers = internalAction({
  args: {},
  handler: async () => {
    const token = process.env.GROUPME_ACCESS_TOKEN;
    const groupId = process.env.GROUPME_GROUP_ID;
    if (!token || !groupId) {
      console.log("[GroupMe] Missing ACCESS_TOKEN or GROUP_ID");
      return [];
    }

    const res = await fetch(
      `https://api.groupme.com/v3/groups/${groupId}?token=${token}`
    );
    if (!res.ok) {
      console.error("[GroupMe] Failed to fetch group:", res.status);
      return [];
    }

    const data = await res.json();
    const members: { userId: string; nickname: string }[] =
      data.response.members.map((m: any) => ({
        userId: m.user_id,
        nickname: m.nickname,
      }));
    return members;
  },
});

export const sendDirectMessage = internalAction({
  args: {
    recipientId: v.string(),
    text: v.string(),
  },
  handler: async (_ctx, args) => {
    const token = process.env.GROUPME_ACCESS_TOKEN;
    if (!token) {
      console.log("[GroupMe DM] No access token set, skipping:", args.text);
      return;
    }

    const res = await fetch(
      `https://api.groupme.com/v3/direct_messages?token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          direct_message: {
            source_guid: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            recipient_id: args.recipientId,
            text: args.text,
          },
        }),
      }
    );
    if (!res.ok) {
      console.error("[GroupMe DM] Failed to send:", res.status, await res.text());
    }
  },
});
