import Image from "next/image";
import { notFound } from "next/dist/client/components/not-found";

import { Redis } from "@upstash/redis";
import cn from "classnames";

import GPTAvatar from "@/components/GPTAvatar";

import styles from "@/styles/utils.module.css";
import Banner from "@/components/banner";

type ConversationItem = {
  from: "human" | "gpt";
  value: string;
};

export type PageData = {
  avatarUrl: string;
  items: ConversationItem[];
};

const redis = Redis.fromEnv();

async function getChatData(id: string): Promise<PageData> {
  const page = (await redis.get(id)) as PageData;
  if (!page) {
    notFound();
  }
  return page;
}

export default async function ChatPage({
  params: { chat },
}: {
  params: { chat: string };
}) {
  const { avatarUrl, items } = await getChatData(chat);
  return (
    <>
      <div className="flex flex-col items-center pb-24">
        {items.map((item) => (
          <div
            key={item.value}
            className={cn(
              "dark:bg-[#343541] dark:text-gray-100 text-gray-700  w-full px-4 py-[2.5rem] flex justify-center border-solid border dark:border-gray-700 border-[(217, 217, 227)] border-t-0",
              {
                "bg-gray-100": item.from === "gpt",
                "dark:bg-[#434654]": item.from === "gpt",
              }
            )}
          >
            <div className="w-full sm:w-[48rem] flex gap-[1.5rem] leading-[1.75]">
              {item.from === "human" ? (
                <Image
                  className="mr-2 rounded-sm h-[28px]"
                  alt="Avatar of the person chatting"
                  width="28"
                  height="28"
                  src={avatarUrl}
                />
              ) : (
                <GPTAvatar />
              )}
              <div className="flex flex-col">
                {item.from === "human" ? (
                  <p className="pb-2">{item.value}</p>
                ) : (
                  <div
                    className={styles.response}
                    dangerouslySetInnerHTML={{ __html: item.value }}
                  />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <Banner />
    </>
  );
}

export async function generateStaticParams() {
  return [{ chat: "z3ftry4pjp" }];
}

