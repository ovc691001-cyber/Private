import crypto from "node:crypto";
import { config } from "../config.js";
import { badRequest, unauthorized } from "../lib/errors.js";
import { hmacSha256Hex } from "../utils/crypto.js";

export type TelegramUserPayload = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
};

export type TelegramInitData = {
  queryId?: string;
  user: TelegramUserPayload;
  authDate: Date;
  startParam?: string;
  raw: URLSearchParams;
};

export function validateTelegramInitData(initData: string, now = new Date()): TelegramInitData {
  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash");
  if (!receivedHash) throw unauthorized("Telegram initData hash is missing");

  const authDateRaw = params.get("auth_date");
  if (!authDateRaw) throw unauthorized("Telegram auth_date is missing");
  const authDate = new Date(Number(authDateRaw) * 1000);
  const ageSeconds = Math.abs(now.getTime() - authDate.getTime()) / 1000;
  if (ageSeconds > 86_400) throw unauthorized("Telegram initData expired");

  const userRaw = params.get("user");
  if (!userRaw) throw badRequest("Telegram user payload is missing");

  const pairs: string[] = [];
  params.forEach((value, key) => {
    if (key !== "hash") pairs.push(`${key}=${value}`);
  });
  pairs.sort();
  const dataCheckString = pairs.join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(config.TELEGRAM_BOT_TOKEN).digest();
  const calculatedHash = hmacSha256Hex(secretKey, dataCheckString);
  const left = Buffer.from(calculatedHash, "hex");
  const right = Buffer.from(receivedHash, "hex");
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) {
    throw unauthorized("Invalid Telegram initData signature");
  }

  const user = JSON.parse(userRaw) as TelegramUserPayload;
  if (!user.id) throw badRequest("Telegram user id is missing");

  return {
    queryId: params.get("query_id") ?? undefined,
    user,
    authDate,
    startParam: params.get("start_param") ?? undefined,
    raw: params
  };
}
