<template>
  <v-dialog
    :model-value="modelValue"
    fullscreen
    transition="dialog-bottom-transition"
    @update:model-value="close"
  >
    <v-card>
      <v-toolbar color="surface" density="comfortable">
        <v-btn icon="mdi-close" @click="close" />
        <v-toolbar-title>
          <span class="text-h6">{{ account?.alias || "Account" }}</span>
          <span class="text-caption text-medium-emphasis ml-2 font-mono">
            {{ accountId }}
          </span>
        </v-toolbar-title>
        <v-spacer />
        <v-btn
          icon="mdi-refresh"
          :loading="loading"
          @click="load"
          aria-label="Refresh"
        />
      </v-toolbar>

      <v-card-text class="pa-6">
        <v-alert
          v-if="error"
          type="error"
          variant="tonal"
          class="mb-4"
          closable
          @click:close="error = null"
        >
          {{ error }}
        </v-alert>

        <!-- Identity -->
        <div class="d-flex flex-wrap gap-2 mb-4">
          <v-chip size="small" prepend-icon="mdi-book-open-variant">
            Ledger {{ account?.ledger }}
            <span v-if="ledgerName" class="ml-1">· {{ ledgerName }}</span>
          </v-chip>
          <v-chip size="small" prepend-icon="mdi-code-tags">
            Code {{ account?.code }}
          </v-chip>
          <v-chip
            v-for="flag in accountFlags"
            :key="flag"
            size="small"
            color="primary"
            variant="tonal"
          >
            {{ flag }}
          </v-chip>
        </div>

        <!-- Balances -->
        <v-row class="mb-2">
          <v-col cols="12" md="4">
            <v-card variant="tonal" :color="balanceColor">
              <v-card-text>
                <div class="text-caption text-uppercase">Net balance</div>
                <div class="text-h5 font-weight-bold">
                  {{ formatAmount(account?.balance || "0") }}
                </div>
                <div class="text-caption text-medium-emphasis">
                  credits posted − debits posted
                </div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col
            v-for="tile in balanceTiles"
            :key="tile.label"
            cols="6"
            md="2"
          >
            <v-card variant="outlined">
              <v-card-text>
                <div class="text-caption text-uppercase text-medium-emphasis">
                  {{ tile.label }}
                </div>
                <div class="text-subtitle-1 font-weight-medium">
                  {{ formatAmount(tile.value) }}
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Balance history -->
        <v-card variant="outlined" class="mb-4">
          <v-card-title class="text-subtitle-1">
            <v-icon icon="mdi-chart-line" size="small" class="mr-2" />
            Balance over time
          </v-card-title>
          <v-card-text>
            <v-alert
              v-if="!hasHistoryFlag"
              type="info"
              variant="tonal"
              density="compact"
            >
              This account was created without the
              <strong>history</strong> flag, so TigerBeetle does not retain its
              balance history. The flag is immutable — set it when creating an
              account to enable this chart.
            </v-alert>
            <div v-else-if="balances.length === 0" class="text-medium-emphasis">
              No balance history recorded yet.
            </div>
            <div v-else style="position: relative; height: 260px">
              <canvas ref="balanceCanvas" />
            </div>
          </v-card-text>
        </v-card>

        <!-- Statement -->
        <v-card variant="outlined">
          <v-card-title
            class="text-subtitle-1 d-flex align-center justify-space-between"
          >
            <span>
              <v-icon icon="mdi-format-list-bulleted" size="small" class="mr-2" />
              Statement
            </span>
            <v-chip size="x-small" variant="tonal">
              {{ transfers.length }} transfer{{
                transfers.length === 1 ? "" : "s"
              }}
            </v-chip>
          </v-card-title>
          <v-data-table
            :headers="headers"
            :items="statement"
            :loading="loading"
            density="comfortable"
            :items-per-page="-1"
            hide-default-footer
          >
            <template #item.direction="{ item }">
              <v-chip
                size="x-small"
                :color="item.incoming ? 'success' : 'error'"
                variant="tonal"
              >
                <v-icon start size="x-small">
                  {{ item.incoming ? "mdi-arrow-down" : "mdi-arrow-up" }}
                </v-icon>
                {{ item.incoming ? "In" : "Out" }}
              </v-chip>
            </template>

            <template #item.counterparty="{ item }">
              <span class="font-mono text-caption">
                {{ item.counterparty }}
              </span>
            </template>

            <template #item.amount="{ item }">
              <span
                class="font-weight-medium"
                :class="item.incoming ? 'text-success' : 'text-error'"
              >
                {{ item.incoming ? "+" : "−" }}{{ formatAmount(item.amount) }}
              </span>
            </template>

            <template #item.runningBalance="{ item }">
              <span v-if="item.affectsPosted" class="font-weight-medium">
                {{ formatAmount(item.runningBalance) }}
              </span>
              <span v-else class="text-medium-emphasis text-caption">—</span>
            </template>

            <template #item.state="{ item }">
              <v-chip
                v-for="flag in item.flagNames"
                :key="flag"
                size="x-small"
                variant="tonal"
                class="mr-1"
              >
                {{ flag }}
              </v-chip>
              <span
                v-if="item.flagNames.length === 0"
                class="text-medium-emphasis text-caption"
              >
                posted
              </span>
            </template>

            <template #item.timestamp="{ item }">
              <span class="text-caption">
                {{ formatTBTimestamp(item.timestamp, true) }}
              </span>
            </template>

            <template #no-data>
              <div class="pa-8 text-center text-medium-emphasis">
                No transfers found for this account.
              </div>
            </template>
          </v-data-table>
        </v-card>

        <div class="text-caption text-medium-emphasis mt-2">
          Running balance is derived backwards from the current posted balance,
          so it is accurate across the transfers shown here. Pending and voided
          transfers do not move posted funds and are marked “—”.
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { useCurrency } from "@/composables/useCurrency";
import {
  AccountFlags,
  TransferFlags,
  decodeFlags,
  flagsToBits,
  hasFlag,
} from "@/constants/tigerbeetle-flags";
import { formatTBAmount, formatTBTimestamp } from "@/utils/bigint";
import { Chart, registerables } from "chart.js";
import { computed, nextTick, ref, watch } from "vue";

Chart.register(...registerables);

interface Props {
  modelValue: boolean;
  accountId: string | null;
  account: any | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{ "update:modelValue": [value: boolean] }>();

const { getCurrencyForLedger, getLedgerName } = useCurrency();

const loading = ref(false);
const error = ref<string | null>(null);
const transfers = ref<any[]>([]);
const balances = ref<any[]>([]);
const balanceCanvas = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;

const headers = [
  { title: "", key: "direction", sortable: false, width: 80 },
  { title: "Counterparty", key: "counterparty", sortable: false },
  { title: "Amount", key: "amount", align: "end" as const, sortable: false },
  {
    title: "Balance after",
    key: "runningBalance",
    align: "end" as const,
    sortable: false,
  },
  { title: "Code", key: "code", sortable: false },
  { title: "State", key: "state", sortable: false },
  { title: "Date", key: "timestamp", sortable: false },
];

const ledgerName = computed(() =>
  props.account ? getLedgerName(props.account.ledger) : ""
);

const accountFlags = computed<string[]>(() => {
  const raw = props.account?.flags;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "number") return decodeFlags(raw, AccountFlags);
  return [];
});

const hasHistoryFlag = computed(() => accountFlags.value.includes("history"));

const balanceColor = computed(() => {
  try {
    const value = BigInt(props.account?.balance || "0");
    if (value > 0n) return "success";
    if (value < 0n) return "error";
  } catch {
    /* fall through to neutral */
  }
  return "surface-variant";
});

const balanceTiles = computed(() => [
  { label: "Debits posted", value: props.account?.debits_posted || "0" },
  { label: "Debits pending", value: props.account?.debits_pending || "0" },
  { label: "Credits posted", value: props.account?.credits_posted || "0" },
  { label: "Credits pending", value: props.account?.credits_pending || "0" },
]);

/**
 * Transfers arrive newest-first. The account's current posted balance is known,
 * so walk backwards subtracting each transfer's effect to get the balance after
 * every entry in the window - correct even when older transfers exist beyond it.
 */
const statement = computed(() => {
  if (!props.accountId) return [];

  let running: bigint;
  try {
    running = BigInt(props.account?.balance || "0");
  } catch {
    running = 0n;
  }

  return transfers.value.map((transfer) => {
    const incoming = transfer.credit_account_id === props.accountId;
    const counterparty = incoming
      ? transfer.debit_account_id
      : transfer.credit_account_id;

    const flags = flagsToBits(transfer.flags, TransferFlags);
    const flagNames = decodeFlags(flags, TransferFlags);

    // Pending reserves funds and voids reverse a reservation; neither moves
    // posted balances.
    const affectsPosted =
      !hasFlag(flags, TransferFlags.pending) &&
      !hasFlag(flags, TransferFlags.void_pending_transfer);

    let amount: bigint;
    try {
      amount = BigInt(transfer.amount || "0");
    } catch {
      amount = 0n;
    }

    const balanceAfter = running;
    if (affectsPosted) {
      running = running - (incoming ? amount : -amount);
    }

    return {
      ...transfer,
      incoming,
      counterparty,
      flagNames,
      affectsPosted,
      runningBalance: balanceAfter.toString(),
    };
  });
});

function formatAmount(value: string): string {
  const ledger = props.account?.ledger;
  return ledger !== undefined
    ? formatTBAmount(value, getCurrencyForLedger(ledger))
    : formatTBAmount(value);
}

function close() {
  emit("update:modelValue", false);
}

async function load() {
  if (!props.accountId) return;

  loading.value = true;
  error.value = null;

  try {
    const [transfersResult, balancesResult] = await Promise.all([
      window.tigerBeetleApi.getAccountTransfers(props.accountId, 200),
      hasHistoryFlag.value
        ? window.tigerBeetleApi.getAccountBalances(props.accountId, 200)
        : Promise.resolve({ success: true, data: [] as any[] }),
    ]);

    if (transfersResult.success) {
      transfers.value = transfersResult.data || [];
    } else {
      error.value = transfersResult.error || "Failed to load transfers";
    }

    if (balancesResult.success) {
      balances.value = balancesResult.data || [];
      await nextTick();
      renderBalanceChart();
    }
  } catch (err: any) {
    error.value = err?.message || "Failed to load account";
  } finally {
    loading.value = false;
  }
}

function renderBalanceChart() {
  chartInstance?.destroy();
  chartInstance = null;

  if (!balanceCanvas.value || balances.value.length === 0) return;
  const ctx = balanceCanvas.value.getContext("2d");
  if (!ctx) return;

  const currency = props.account
    ? getCurrencyForLedger(props.account.ledger)
    : undefined;
  const scale = 10 ** (currency?.decimals ?? 2);

  // Oldest first so the line reads left to right.
  const ordered = [...balances.value].reverse();

  chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: ordered.map((b) => formatTBTimestamp(b.timestamp, true)),
      datasets: [
        {
          label: "Balance",
          data: ordered.map((b) => Number(BigInt(b.balance)) / scale),
          borderColor: "#1867C0",
          backgroundColor: "rgba(24, 103, 192, 0.15)",
          fill: true,
          tension: 0.25,
          pointRadius: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { ticks: { maxTicksLimit: 8 } } },
    },
  });
}

watch(
  () => [props.modelValue, props.accountId],
  ([open]) => {
    if (open) {
      transfers.value = [];
      balances.value = [];
      load();
    } else {
      chartInstance?.destroy();
      chartInstance = null;
    }
  }
);
</script>
