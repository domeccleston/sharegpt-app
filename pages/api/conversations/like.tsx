import type { NextApiRequest, NextApiResponse } from "next";
import { redis } from "@/lib/upstash";

import { ChatProps } from "@/pages/[chat]";

export default async function like(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== "string") return res.status(400).end();

  try {
    const conversation = (await redis.get(id)) as ChatProps;
    if (!conversation) return res.status(404).end();
    if (!conversation.likes) {
      conversation.likes = 1;
    } else {
      conversation.likes += 1;
    }
    await redis.set(id, { ...conversation });
    return res.status(200).json(conversation.likes);
  } catch (error) {
    return res.status(500).json(error);
  }
}
