import type {
  CurrencyConfig,
  TB_Amount,
  TB_Timestamp,
} from "@/types/tigerbeetle";
import { DEFAULT_CURRENCY } from "@/types/tigerbeetle";

export function formatTBAmount(
  amount: TB_Amount,
  currency: CurrencyConfig = DEFAULT_CURRENCY
): string {
  try {
    const bigIntAmount = BigInt(amount);
    const divisor = BigInt(10 ** currency.decimals);
    const whole = bigIntAmount / divisor;
    const fraction = bigIntAmount % divisor;

    const fractionStr = fraction.toString().padStart(currency.decimals, "0");
    const wholeStr = whole.toLocaleString("en-US");

    return `${currency.symbol}${wholeStr}.${fractionStr}`;
  } catch (error) {
    return `${currency.symbol}0.00`;
  }
}

export function formatTBAmountRaw(amount: TB_Amount): string {
  try {
    const bigIntAmount = BigInt(amount);
    return bigIntAmount.toLocaleString("en-US");
  } catch (error) {
    return "0";
  }
}

export function parseTBAmount(
  input: string,
  currency: CurrencyConfig = DEFAULT_CURRENCY
): TB_Amount {
  const cleaned = input.replace(/[^0-9.]/g, "");
  const [whole = "0", fraction = "0"] = cleaned.split(".");
  const paddedFraction = fraction
    .padEnd(currency.decimals, "0")
    .slice(0, currency.decimals);
  const amount =
    BigInt(whole) * BigInt(10 ** currency.decimals) + BigInt(paddedFraction);
  return amount.toString();
}

export function compareTBAmount(a: TB_Amount, b: TB_Amount): number {
  try {
    const bigA = BigInt(a);
    const bigB = BigInt(b);
    return bigA > bigB ? 1 : bigA < bigB ? -1 : 0;
  } catch (error) {
    return 0;
  }
}

export function isPositiveTBAmount(amount: TB_Amount): boolean {
  try {
    return BigInt(amount) > 0n;
  } catch {
    return false;
  }
}

export function isNegativeTBAmount(amount: TB_Amount): boolean {
  try {
    return BigInt(amount) < 0n;
  } catch {
    return false;
  }
}

export function isValidTBID(id: string): boolean {
  if (!id || id.trim() === "") return false;

  try {
    const bigIntId = BigInt(id);
    return (
      bigIntId >= 0n &&
      bigIntId <= BigInt("340282366920938463463374607431768211455")
    );
  } catch {
    return false;
  }
}

export function isValidTBAmount(amount: string): boolean {
  if (!amount || amount.trim() === "") return false;

  try {
    const bigIntAmount = BigInt(amount);
    return bigIntAmount >= 0n;
  } catch {
    return false;
  }
}

export function formatTBTimestamp(
  timestamp: TB_Timestamp,
  includeTimezone: boolean = true
): string {
  if (!timestamp || timestamp === "0") return "N/A";

  try {
    const nanoseconds = BigInt(timestamp);
    const milliseconds = Number(nanoseconds / 1000000n);
    const date = new Date(milliseconds);

    if (includeTimezone) {
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZoneName: "short",
      });
    }

    return date.toLocaleString("en-US");
  } catch (error) {
    return "Invalid Date";
  }
}

export function formatTBTimestampISO(timestamp: TB_Timestamp): string {
  if (!timestamp || timestamp === "0") return "N/A";

  try {
    const nanoseconds = BigInt(timestamp);
    const milliseconds = Number(nanoseconds / 1000000n);
    const date = new Date(milliseconds);
    return date.toISOString();
  } catch (error) {
    return "Invalid Date";
  }
}

export function decodeAccountFlags(flags: number): string[] {
  const result: string[] = [];
  if (flags & 0x01) result.push("linked");
  if (flags & 0x02) result.push("debits_must_not_exceed_credits");
  if (flags & 0x04) result.push("credits_must_not_exceed_debits");
  if (flags & 0x08) result.push("history");
  return result;
}

export function decodeTransferFlags(flags: number): string[] {
  const result: string[] = [];
  if (flags & 0x01) result.push("linked");
  if (flags & 0x02) result.push("pending");
  if (flags & 0x04) result.push("post_pending_transfer");
  if (flags & 0x08) result.push("void_pending_transfer");
  if (flags & 0x10) result.push("balancing_debit");
  if (flags & 0x20) result.push("balancing_credit");
  return result;
}

export const MAX_TB_ID = "340282366920938463463374607431768211455";
export const MAX_TB_AMOUNT = "340282366920938463463374607431768211455";
