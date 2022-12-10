// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
const redis = Redis.fromEnv();
import TurndownService from "turndown";
import { markdownToRichText } from "@tryfabric/martian";
import { NotionDatabaseNotFound } from "utils/CustomExceptions";

// Create a new ratelimiter, that allows 10 requests per 10 seconds
export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
});

const turndownService = new TurndownService();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  //   if (req.headers.origin !== "https://shareg.pt") {
  //     return res.status(400).json("Invalid origin");
  //   }
  if (req.method !== "OPTIONS") {
    const { success } = await ratelimit.limit(
      "sharegpt-save-to-notion-endpoint"
    );
    if (!success) {
      res.status(429).json({ error: "Don't DDoS me pls 🥺" });
    }

    const code = req.query.code;
    const basicToken = Buffer.from(
      `${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`
    ).toString("base64");

    try {
      const response = await fetch("https://api.notion.com/v1/oauth/token", {
        method: "post",
        body: JSON.stringify({
          code: code,
          grant_type: "authorization_code",
        }),
        headers: {
          Authorization: `Basic ${basicToken}`,
          "Content-Type": "application/json",
        },
      });

      // TODO: save the necessary data
      const notionResponse = await response.json();

      const cachedKey = req.query.state;
      if (cachedKey) {
        await saveToNotion(cachedKey, notionResponse);
        res.redirect(`${process.env.BASE_URL}/${cachedKey}`);
      } else {
        res.redirect(
          `${process.env.BASE_URL}?error="Key not included in request"`
        );
      }
    } catch (error: any) {
      res.redirect(
        `${process.env.BASE_URL}?error=${
          error?.status?.data?.message ||
          error?.message ||
          "Something went wrong"
        }`
      );
    }
  } else {
    return res.status(200).end();
  }
}

const saveToNotion = async (cachedKey: any, notionResponse: any) => {
  const response = await fetch("https://api.notion.com/v1/search", {
    method: "POST",
    headers: {
      authorization: `Bearer ${notionResponse.access_token}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
  });

  const { results } = await response.json();

  if (results.length) {
    const databaseId = results.find(
      (result: any) => result.object === "database"
    )?.id;

    if (!databaseId) throw new NotionDatabaseNotFound("No database found");

    const pageContent = await generatePageContent(databaseId, cachedKey);

    await fetch(`https://api.notion.com/v1/pages`, {
      method: "post",
      body: JSON.stringify(pageContent),
      headers: {
        Authorization: `Bearer ${notionResponse.access_token}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
    });
  }
};

type JSONConversation = {
  items: {
    from: string;
    value: string;
  }[];
};

const generatePageContent = async (databaseId: any, cachedKey: any) => {
  const jsonConversation = (await redis.get(cachedKey)) as JSONConversation;
  return {
    parent: {
      database_id: databaseId,
    },
    properties: {
      Name: {
        title: [
          {
            text: {
              content:
                (jsonConversation.items.length > 0
                  ? jsonConversation.items[0].value
                  : ""
                ).substring(0, 100) || "Conversation with chatGPT",
            },
          },
        ],
      },
    },
    children: jsonConversation.items.map((item: any) => {
      return {
        type: "callout",
        callout: {
          rich_text: markdownToRichText(
            turndownService.turndown(item.value || "")
          ),
          icon: {
            emoji: item.from === "human" ? "👨‍💻" : "🤖",
          },
          color: "default",
        },
      };
    }),
  };
};
