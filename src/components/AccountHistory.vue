<template>
  <div>
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between pa-4">
        <div class="d-flex align-center">
          <v-icon icon="mdi-history" class="mr-2" color="primary" />
          <span class="text-h5">Account History</span>
        </div>
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

      <v-card-text>
        
        <v-row>
          <v-col cols="12" md="8">
            <v-autocomplete
              v-model="selectedAccountId"
              :items="accounts"
              item-title="displayName"
              item-value="id"
              label="Select Account"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-account-search"
              clearable
              :loading="loadingAccounts"
              @update:model-value="loadHistory"
            >
              <template #item="{ props, item }">
                <v-list-item v-bind="props">
                  <template #prepend>
                    <v-icon icon="mdi-account" />
                  </template>
                  <template #subtitle>
                    ID: {{ item.raw.id }} | Balance:
                    {{ formatAmount(item.raw.balance, item.raw.ledger) }}
                  </template>
                </v-list-item>
              </template>
            </v-autocomplete>
          </v-col>

          <v-col cols="12" md="4">
            <v-select
              v-model="timeRange"
              :items="timeRangeOptions"
              label="Time Range"
              variant="outlined"
              density="comfortable"
              @update:model-value="loadHistory"
            />
          </v-col>
        </v-row>

        
        <v-card v-if="selectedAccount" variant="outlined" class="mb-4">
          <v-card-text>
            <v-row>
              <v-col cols="12" md="3">
                <div class="text-caption text-grey">Account</div>
                <div class="text-h6">{{ selectedAccount.alias }}</div>
                <div class="text-caption">{{ selectedAccount.id }}</div>
              </v-col>
              <v-col cols="12" md="3">
                <div class="text-caption text-grey">Current Balance</div>
                <v-chip
                  :color="getBalanceColor(selectedAccount.balance)"
                  variant="flat"
                >
                  {{
                    formatAmount(
                      selectedAccount.balance,
                      selectedAccount.ledger
                    )
                  }}
                </v-chip>
              </v-col>
              <v-col cols="12" md="3">
                <div class="text-caption text-grey">Total Debits</div>
                <div class="text-h6 text-error">
                  {{
                    formatAmount(
                      selectedAccount.debits_posted,
                      selectedAccount.ledger
                    )
                  }}
                </div>
              </v-col>
              <v-col cols="12" md="3">
                <div class="text-caption text-grey">Total Credits</div>
                <div class="text-h6 text-success">
                  {{
                    formatAmount(
                      selectedAccount.credits_posted,
                      selectedAccount.ledger
                    )
                  }}
                </div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        
        <div v-if="loading" class="text-center py-8">
          <v-progress-circular indeterminate color="primary" />
          <div class="mt-4">Loading transaction history...</div>
        </div>

        <div v-else-if="history.length > 0">
          <div class="d-flex align-center justify-space-between mb-4">
            <div class="d-flex align-center">
              <v-icon icon="mdi-timeline-text" class="mr-2" />
              <span class="text-h6">Transaction Timeline</span>
              <v-chip class="ml-3" size="small" color="info">
                {{ history.length }} transactions
              </v-chip>
            </div>
            <v-btn
              variant="outlined"
              prepend-icon="mdi-download"
              size="small"
              @click="exportHistory"
            >
              Export
            </v-btn>
          </div>

          <v-timeline side="end" density="compact">
            <v-timeline-item
              v-for="(transaction, index) in history"
              :key="index"
              :dot-color="transaction.type === 'credit' ? 'success' : 'error'"
              size="small"
            >
              <template #icon>
                <v-icon
                  :icon="
                    transaction.type === 'credit' ? 'mdi-plus' : 'mdi-minus'
                  "
                  size="x-small"
                />
              </template>

              <v-card>
                <v-card-text>
                  <div class="d-flex justify-space-between align-center mb-2">
                    <div>
                      <v-chip
                        :color="
                          transaction.type === 'credit' ? 'success' : 'error'
                        "
                        size="small"
                        class="mr-2"
                      >
                        {{ transaction.type.toUpperCase() }}
                      </v-chip>
                      <span class="font-weight-bold">
                        {{
                          formatAmount(transaction.amount, transaction.ledger)
                        }}
                      </span>
                    </div>
                    <div class="text-caption text-grey">
                      {{ formatDate(transaction.timestamp) }}
                    </div>
                  </div>

                  <v-divider class="my-2" />

                  <div class="text-body-2">
                    <div class="mb-1">
                      <strong>Transfer ID:</strong> {{ transaction.transferId }}
                    </div>
                    <div class="mb-1">
                      <strong
                        >{{
                          transaction.type === "credit" ? "From" : "To"
                        }}:</strong
                      >
                      {{
                        transaction.counterpartyAlias ||
                        transaction.counterpartyId
                      }}
                    </div>
                    <div class="mb-1">
                      <strong>Ledger:</strong> {{ transaction.ledger }} |
                      <strong>Code:</strong> {{ transaction.code }}
                    </div>
                    <div
                      v-if="transaction.flags && transaction.flags.length > 0"
                    >
                      <strong>Flags:</strong>
                      <v-chip
                        v-for="flag in transaction.flags"
                        :key="flag"
                        size="x-small"
                        class="ml-1"
                      >
                        {{ flag }}
                      </v-chip>
                    </div>
                    <div class="mt-2">
                      <strong>Running Balance:</strong>
                      <v-chip
                        size="x-small"
                        :color="getBalanceColor(transaction.runningBalance)"
                      >
                        {{
                          formatAmount(
                            transaction.runningBalance,
                            transaction.ledger
                          )
                        }}
                      </v-chip>
                    </div>
                  </div>
                </v-card-text>
              </v-card>
            </v-timeline-item>
          </v-timeline>
        </div>

        <v-alert
          v-else-if="selectedAccountId && !loading"
          type="info"
          variant="tonal"
        >
          No transactions found for this account in the selected time range.
        </v-alert>

        <v-alert v-else type="info" variant="tonal">
          Select an account to view its transaction history.
        </v-alert>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { useCurrency } from "@/composables/useCurrency";
import type { TBAccount, TBTransfer } from "@/types/tigerbeetle";
import {
  formatTBAmount,
  formatTBTimestamp,
  isPositiveTBAmount,
} from "@/utils/bigint";
import { onMounted, ref } from "vue";

const { getCurrencyForLedger, loadCurrency } = useCurrency();

interface Props {
  isConnected: boolean;
}

const props = defineProps<Props>();

interface Transaction {
  transferId: string;
  type: "debit" | "credit";
  amount: string;
  counterpartyId: string;
  counterpartyAlias?: string;
  timestamp: string;
  ledger: number;
  code: number;
  flags: string[];
  runningBalance: string;
}

const loading = ref(false);
const loadingAccounts = ref(false);
const error = ref<string | null>(null);
const selectedAccountId = ref<string | null>(null);
const selectedAccount = ref<TBAccount | null>(null);
const accounts = ref<TBAccount[]>([]);
const history = ref<Transaction[]>([]);
const timeRange = ref("all");

const timeRangeOptions = [
  { title: "All Time", value: "all" },
  { title: "Last 24 Hours", value: "24h" },
  { title: "Last 7 Days", value: "7d" },
  { title: "Last 30 Days", value: "30d" },
  { title: "Last 90 Days", value: "90d" },
];

onMounted(async () => {
  await loadAccounts();
});

async function loadAccounts() {
  if (!props.isConnected) return;

  loadingAccounts.value = true;
  try {
    const result = await window.tigerBeetleApi.getAccounts(1000, 0);
    if (result.success) {
      const data = result.data;
      const accountsData =
        data && "data" in data ? data.data : (data as any[]) || [];

      accounts.value = accountsData.map((acc: any) => ({
        ...acc,
        displayName: `${acc.alias} (${acc.id.substring(0, 12)}...)`,
      }));
    }
  } catch (err) {
  } finally {
    loadingAccounts.value = false;
  }
}

async function loadHistory() {
  if (!selectedAccountId.value || !props.isConnected) return;

  loadCurrency();
  loading.value = true;
  error.value = null;
  history.value = [];

  try {
    
    const accountResult = await window.tigerBeetleApi.getAccounts(1000, 0);
    if (accountResult.success) {
      const data = accountResult.data;
      const accountsData =
        data && "data" in data ? data.data : (data as any[]) || [];
      selectedAccount.value =
        accountsData.find((a: any) => a.id === selectedAccountId.value) || null;
    }

    
    const transfersResult = await window.tigerBeetleApi.getTransfers(1000, 0);
    if (!transfersResult.success) {
      error.value = transfersResult.error || "Failed to load transfers";
      return;
    }

    const data = transfersResult.data;
    const transfers =
      data && "data" in data ? data.data : (data as any[]) || [];

    
    const relevantTransfers = transfers.filter(
      (t: TBTransfer) =>
        t.debit_account_id === selectedAccountId.value ||
        t.credit_account_id === selectedAccountId.value
    );

    
    const filteredTransfers = applyTimeRangeFilter(relevantTransfers);

    
    filteredTransfers.sort((a: any, b: any) => {
      const aTime = Number(BigInt(a.timestamp || "0") / 1000000n);
      const bTime = Number(BigInt(b.timestamp || "0") / 1000000n);
      return aTime - bTime;
    });

    
    let runningBalance = BigInt(0);
    const transactions: Transaction[] = [];

    for (const transfer of filteredTransfers) {
      const isDebit = transfer.debit_account_id === selectedAccountId.value;
      const amount = BigInt(transfer.amount || "0");

      if (isDebit) {
        runningBalance -= amount;
        transactions.push({
          transferId: transfer.id,
          type: "debit",
          amount: transfer.amount,
          counterpartyId: transfer.credit_account_id,
          counterpartyAlias: transfer.credit_alias,
          timestamp: transfer.timestamp,
          ledger: transfer.ledger,
          code: transfer.code,
          flags: transfer.flags || [],
          runningBalance: runningBalance.toString(),
        });
      } else {
        runningBalance += amount;
        transactions.push({
          transferId: transfer.id,
          type: "credit",
          amount: transfer.amount,
          counterpartyId: transfer.debit_account_id,
          counterpartyAlias: transfer.debit_alias,
          timestamp: transfer.timestamp,
          ledger: transfer.ledger,
          code: transfer.code,
          flags: transfer.flags || [],
          runningBalance: runningBalance.toString(),
        });
      }
    }

    
    history.value = transactions.reverse();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Failed to load history";
  } finally {
    loading.value = false;
  }
}

function applyTimeRangeFilter(transfers: any[]): any[] {
  if (timeRange.value === "all") return transfers;

  const now = Date.now();
  let cutoffTime = 0;

  switch (timeRange.value) {
    case "24h":
      cutoffTime = now - 24 * 60 * 60 * 1000;
      break;
    case "7d":
      cutoffTime = now - 7 * 24 * 60 * 60 * 1000;
      break;
    case "30d":
      cutoffTime = now - 30 * 24 * 60 * 60 * 1000;
      break;
    case "90d":
      cutoffTime = now - 90 * 24 * 60 * 60 * 1000;
      break;
  }

  return transfers.filter((t: any) => {
    const timestamp = Number(BigInt(t.timestamp || "0") / 1000000n);
    return timestamp >= cutoffTime;
  });
}

function formatAmount(value: string | number, ledger?: number): string {
  const strValue = typeof value === "string" ? value : value.toString();
  if (ledger !== undefined) {
    const currency = getCurrencyForLedger(ledger);
    return formatTBAmount(strValue, currency);
  }
  return formatTBAmount(strValue);
}

function formatDate(timestamp: string): string {
  return formatTBTimestamp(timestamp, true);
}

function getBalanceColor(balance: string): string {
  return isPositiveTBAmount(balance) ? "success" : "error";
}

function exportHistory() {
  if (history.value.length === 0) return;

  const csv = [
    [
      "Timestamp",
      "Type",
      "Amount",
      "Counterparty",
      "Ledger",
      "Code",
      "Running Balance",
    ].join(","),
    ...history.value.map((t) =>
      [
        formatDate(t.timestamp),
        t.type,
        formatAmount(t.amount, t.ledger),
        t.counterpartyAlias || t.counterpartyId,
        t.ledger,
        t.code,
        formatAmount(t.runningBalance, t.ledger),
      ]
        .map((v) => `"${v}"`)
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `account_history_${selectedAccountId.value}_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
</script>
