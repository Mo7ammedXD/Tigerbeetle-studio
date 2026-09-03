<template>
  <div>
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between pa-4">
        <div class="d-flex align-center">
          <v-icon icon="mdi-scale-balance" class="mr-2" color="primary" />
          <span class="text-h5">Trial Balance</span>
        </div>
        <v-btn
          color="primary"
          variant="flat"
          prepend-icon="mdi-play"
          :loading="running"
          :disabled="!isConnected"
          @click="run"
        >
          Run check
        </v-btn>
      </v-card-title>

      <v-alert
        v-if="error"
        type="error"
        variant="tonal"
        class="ma-4"
        closable
        @click:close="error = null"
      >
        {{ error }}
      </v-alert>

      <v-divider />

      <v-card-text v-if="!hasRun && !running" class="pa-8 text-center">
        <v-icon size="56" color="grey-lighten-1">mdi-scale-balance</v-icon>
        <div class="text-h6 mt-3">Verify ledger integrity</div>
        <div class="text-body-2 text-medium-emphasis mt-1">
          Scans every account and checks that debits equal credits on each
          ledger, then reports any account violating its own constraints.
        </div>
      </v-card-text>

      <v-card-text v-else-if="running" class="pa-8 text-center">
        <v-progress-circular indeterminate color="primary" size="48" />
        <div class="text-body-2 mt-4">
          Scanned {{ scanned.toLocaleString() }} accounts…
        </div>
      </v-card-text>

      <template v-else>
        <!-- Verdict -->
        <v-card-text>
          <v-alert
            :type="allBalanced && violations.length === 0 ? 'success' : 'error'"
            variant="tonal"
            prominent
          >
            <div class="text-h6">
              {{
                allBalanced && violations.length === 0
                  ? "Ledgers balance"
                  : "Discrepancies found"
              }}
            </div>
            <div class="text-body-2">
              Checked {{ scanned.toLocaleString() }} accounts across
              {{ ledgerRows.length }} ledger{{
                ledgerRows.length === 1 ? "" : "s"
              }}.
              <span v-if="violations.length">
                {{ violations.length }} account{{
                  violations.length === 1 ? "" : "s"
                }}
                violate their constraints.
              </span>
              <span v-if="truncated">
                Scan stopped at the {{ MAX_SCAN.toLocaleString() }}-account cap,
                so this is a partial result.
              </span>
            </div>
          </v-alert>
        </v-card-text>

        <!-- Per ledger -->
        <v-card-text class="pt-0">
          <div class="text-subtitle-1 mb-2">By ledger</div>
          <v-data-table
            :headers="ledgerHeaders"
            :items="ledgerRows"
            density="comfortable"
            :items-per-page="-1"
            hide-default-footer
          >
            <template #item.ledger="{ item }">
              <span class="font-weight-medium">{{ item.ledger }}</span>
              <span
                v-if="item.name"
                class="text-caption text-medium-emphasis ml-2"
              >
                {{ item.name }}
              </span>
            </template>

            <template #item.debits="{ item }">
              {{ formatAmount(item.debits, item.ledger) }}
            </template>

            <template #item.credits="{ item }">
              {{ formatAmount(item.credits, item.ledger) }}
            </template>

            <template #item.difference="{ item }">
              <span
                :class="
                  item.difference === '0'
                    ? 'text-success'
                    : 'text-error font-weight-bold'
                "
              >
                {{ formatAmount(item.difference, item.ledger) }}
              </span>
            </template>

            <template #item.pending="{ item }">
              <span class="text-medium-emphasis">
                {{ formatAmount(item.pending, item.ledger) }}
              </span>
            </template>

            <template #item.status="{ item }">
              <v-chip
                size="small"
                :color="item.difference === '0' ? 'success' : 'error'"
                variant="tonal"
              >
                {{ item.difference === "0" ? "Balanced" : "Unbalanced" }}
              </v-chip>
            </template>
          </v-data-table>
        </v-card-text>

        <!-- Violations -->
        <v-card-text v-if="violations.length" class="pt-0">
          <div class="text-subtitle-1 mb-2">Constraint violations</div>
          <v-data-table
            :headers="violationHeaders"
            :items="violations"
            density="comfortable"
            :items-per-page="-1"
            hide-default-footer
          >
            <template #item.id="{ item }">
              <span class="font-mono text-caption">{{ item.id }}</span>
            </template>
            <template #item.balance="{ item }">
              {{ formatAmount(item.balance, item.ledger) }}
            </template>
            <template #item.reason="{ item }">
              <v-chip size="small" color="error" variant="tonal">
                {{ item.reason }}
              </v-chip>
            </template>
          </v-data-table>
        </v-card-text>
      </template>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { useCurrency } from "@/composables/useCurrency";
import { AccountFlags, hasFlag } from "@/constants/tigerbeetle-flags";
import { formatTBAmount } from "@/utils/bigint";
import { computed, ref } from "vue";

interface Props {
  isConnected: boolean;
}

const props = defineProps<Props>();

const { getCurrencyForLedger, getLedgerName } = useCurrency();

const PAGE_SIZE = 1000;
const MAX_SCAN = 50000;

const running = ref(false);
const hasRun = ref(false);
const error = ref<string | null>(null);
const scanned = ref(0);
const truncated = ref(false);
const ledgerRows = ref<any[]>([]);
const violations = ref<any[]>([]);

const ledgerHeaders = [
  { title: "Ledger", key: "ledger", sortable: false },
  { title: "Accounts", key: "accounts", align: "end" as const, sortable: false },
  {
    title: "Debits posted",
    key: "debits",
    align: "end" as const,
    sortable: false,
  },
  {
    title: "Credits posted",
    key: "credits",
    align: "end" as const,
    sortable: false,
  },
  {
    title: "Difference",
    key: "difference",
    align: "end" as const,
    sortable: false,
  },
  { title: "Pending", key: "pending", align: "end" as const, sortable: false },
  { title: "Status", key: "status", sortable: false },
];

const violationHeaders = [
  { title: "Account", key: "id", sortable: false },
  { title: "Alias", key: "alias", sortable: false },
  { title: "Ledger", key: "ledger", sortable: false },
  { title: "Balance", key: "balance", align: "end" as const, sortable: false },
  { title: "Violation", key: "reason", sortable: false },
];

const allBalanced = computed(() =>
  ledgerRows.value.every((row) => row.difference === "0")
);

function formatAmount(value: string, ledger?: number): string {
  return ledger !== undefined
    ? formatTBAmount(value, getCurrencyForLedger(ledger))
    : formatTBAmount(value);
}

function toBigInt(value: unknown): bigint {
  try {
    return BigInt((value as string) || "0");
  } catch {
    return 0n;
  }
}

/**
 * Every TigerBeetle transfer debits one account and credits another on the
 * same ledger, so summed posted debits must equal summed posted credits per
 * ledger. Any difference means data was not written the way it was assumed.
 */
function analyse(accounts: any[]) {
  const byLedger = new Map<
    number,
    { debits: bigint; credits: bigint; pending: bigint; accounts: number }
  >();
  const found: any[] = [];

  for (const account of accounts) {
    const ledger = account.ledger;
    const entry =
      byLedger.get(ledger) ??
      { debits: 0n, credits: 0n, pending: 0n, accounts: 0 };

    const debitsPosted = toBigInt(account.debits_posted);
    const creditsPosted = toBigInt(account.credits_posted);

    entry.debits += debitsPosted;
    entry.credits += creditsPosted;
    entry.pending +=
      toBigInt(account.debits_pending) + toBigInt(account.credits_pending);
    entry.accounts += 1;
    byLedger.set(ledger, entry);

    const balance = creditsPosted - debitsPosted;
    const flags = Array.isArray(account.flags)
      ? account.flags
      : typeof account.flags === "number"
        ? account.flags
        : 0;

    const flagNames: string[] = Array.isArray(flags) ? flags : [];
    const flagBits = typeof flags === "number" ? flags : 0;

    const has = (name: string, bit: number) =>
      flagNames.includes(name) || hasFlag(flagBits, bit);

    if (
      has("debits_must_not_exceed_credits", AccountFlags.debits_must_not_exceed_credits) &&
      balance < 0n
    ) {
      found.push({
        ...account,
        balance: balance.toString(),
        reason: "Debits exceed credits",
      });
    }

    if (
      has("credits_must_not_exceed_debits", AccountFlags.credits_must_not_exceed_debits) &&
      balance > 0n
    ) {
      found.push({
        ...account,
        balance: balance.toString(),
        reason: "Credits exceed debits",
      });
    }

    if (has("closed", AccountFlags.closed) && balance !== 0n) {
      found.push({
        ...account,
        balance: balance.toString(),
        reason: "Closed with non-zero balance",
      });
    }
  }

  ledgerRows.value = [...byLedger.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([ledger, entry]) => ({
      ledger,
      name: getLedgerName(ledger),
      accounts: entry.accounts,
      debits: entry.debits.toString(),
      credits: entry.credits.toString(),
      difference: (entry.debits - entry.credits).toString(),
      pending: entry.pending.toString(),
    }));

  violations.value = found;
}

async function run() {
  if (!props.isConnected) return;

  running.value = true;
  error.value = null;
  scanned.value = 0;
  truncated.value = false;
  ledgerRows.value = [];
  violations.value = [];

  const collected: any[] = [];
  let cursor: string | null = null;

  try {
    while (collected.length < MAX_SCAN) {
      const result = await window.tigerBeetleApi.getAccounts(
        PAGE_SIZE,
        cursor,
        "next"
      );

      if (!result.success || !result.data) {
        error.value = result.error || "Failed to read accounts";
        break;
      }

      const page = result.data.data || [];
      collected.push(...page);
      scanned.value = collected.length;

      if (!result.data.hasMore || !result.data.nextCursor) break;
      cursor = result.data.nextCursor;
    }

    truncated.value = collected.length >= MAX_SCAN;
    analyse(collected);
    hasRun.value = true;
  } catch (err: any) {
    error.value = err?.message || "Trial balance failed";
  } finally {
    running.value = false;
  }
}
</script>
