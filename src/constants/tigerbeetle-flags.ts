/**
 * TigerBeetle flag bits, mirrored from the `tigerbeetle-node` bindings.
 * Kept here so the renderer can present and decode them without importing
 * the native client (which is main-process only).
 */

export const AccountFlags = {
  linked: 1,
  debits_must_not_exceed_credits: 2,
  credits_must_not_exceed_debits: 4,
  history: 8,
  imported: 16,
  closed: 32,
} as const;

export const TransferFlags = {
  linked: 1,
  pending: 2,
  post_pending_transfer: 4,
  void_pending_transfer: 8,
  balancing_debit: 16,
  balancing_credit: 32,
  closing_debit: 64,
  closing_credit: 128,
  imported: 256,
} as const;

export interface FlagOption {
  bit: number;
  key: string;
  label: string;
  description: string;
  /** Not settable from the create forms - set by the system or unsupported. */
  readonlyFlag?: boolean;
}

export const ACCOUNT_FLAG_OPTIONS: FlagOption[] = [
  {
    bit: AccountFlags.debits_must_not_exceed_credits,
    key: "debits_must_not_exceed_credits",
    label: "Debits must not exceed credits",
    description:
      "Rejects any transfer that would overdraw this account. Use for asset accounts holding real funds.",
  },
  {
    bit: AccountFlags.credits_must_not_exceed_debits,
    key: "credits_must_not_exceed_debits",
    label: "Credits must not exceed debits",
    description:
      "The liability-side equivalent: the account can never be credited beyond what it has been debited.",
  },
  {
    bit: AccountFlags.history,
    key: "history",
    label: "Track balance history",
    description:
      "Required for the balance-over-time chart on the account page. Cannot be enabled after creation.",
  },
  {
    bit: AccountFlags.linked,
    key: "linked",
    label: "Linked",
    description:
      "Chains this account to the next one in the same batch so they succeed or fail together.",
  },
];

export const TRANSFER_FLAG_OPTIONS: FlagOption[] = [
  {
    bit: TransferFlags.pending,
    key: "pending",
    label: "Pending (two-phase)",
    description:
      "Reserves the funds without posting them. Resolve later from the Pending view.",
  },
  {
    bit: TransferFlags.balancing_debit,
    key: "balancing_debit",
    label: "Balancing debit",
    description:
      "Transfers at most the amount, reduced to whatever the debit account can cover.",
  },
  {
    bit: TransferFlags.balancing_credit,
    key: "balancing_credit",
    label: "Balancing credit",
    description:
      "Transfers at most the amount, reduced to whatever the credit account can accept.",
  },
  {
    bit: TransferFlags.closing_debit,
    key: "closing_debit",
    label: "Closing debit",
    description:
      "Closes the debit account once this transfer posts. Requires a pending transfer.",
  },
  {
    bit: TransferFlags.closing_credit,
    key: "closing_credit",
    label: "Closing credit",
    description:
      "Closes the credit account once this transfer posts. Requires a pending transfer.",
  },
];

export function decodeFlags(
  flags: number,
  table: Record<string, number>
): string[] {
  return Object.entries(table)
    .filter(([, bit]) => (flags & bit) !== 0)
    .map(([name]) => name);
}

export function hasFlag(flags: number, bit: number): boolean {
  return (flags & bit) !== 0;
}

/**
 * Normalise a flags value to a bitmask.
 *
 * The IPC layer is inconsistent: `get-transfers` and `get-accounts` return
 * flags already decoded to a string array for display, while `lookup-*` and
 * `get-account-transfers` return the raw number. Consumers that test bits must
 * accept both, or they silently read every row as having no flags at all.
 */
export function flagsToBits(
  flags: unknown,
  table: Record<string, number>
): number {
  if (typeof flags === "number") return flags;
  if (Array.isArray(flags)) {
    return flags.reduce<number>((acc, name) => acc | (table[name] ?? 0), 0);
  }
  const parsed = Number(flags);
  return Number.isFinite(parsed) ? parsed : 0;
}
