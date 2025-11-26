<template>
  <div>
    <v-row>
      <v-col cols="12" class="mb-4">
        <v-text-field
          v-model="searchQuery"
          label="Search Accounts or Transfers"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="comfortable"
          clearable
          hint="Search by account ID, alias, or transfer ID (min 3 characters)"
          persistent-hint
          @update:model-value="onSearch"
        />
      </v-col>

      <v-col v-if="searchResults.length > 0" cols="12">
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon icon="mdi-magnify" class="mr-2" />
            Search Results ({{ searchResults.length }})
          </v-card-title>
          <v-card-text>
            <v-list density="compact">
              <v-list-item
                v-for="result in searchResults.slice(0, 10)"
                :key="result.data.id"
              >
                <template #prepend>
                  <v-icon
                    :icon="
                      result.type === 'account'
                        ? 'mdi-account'
                        : 'mdi-bank-transfer'
                    "
                    :color="result.type === 'account' ? 'primary' : 'success'"
                  />
                </template>
                <v-list-item-title v-if="result.type === 'account'">
                  {{ result.data.alias }} ({{
                    result.data.id.substring(0, 12)
                  }}...)
                </v-list-item-title>
                <v-list-item-title v-else>
                  Transfer:
                  {{
                    result.data.debit_alias ||
                    result.data.debit_account_id.substring(0, 12)
                  }}
                  →
                  {{
                    result.data.credit_alias ||
                    result.data.credit_account_id.substring(0, 12)
                  }}
                </v-list-item-title>
                <v-list-item-subtitle v-if="result.type === 'account'">
                  Balance: {{ formatAmount(result.data.balance) }} • Ledger
                  {{ result.data.ledger }}
                </v-list-item-subtitle>
                <v-list-item-subtitle v-else>
                  Amount: {{ formatAmount(result.data.amount) }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card color="primary" variant="tonal">
          <v-card-text>
            <div class="d-flex align-center justify-space-between">
              <div>
                <div class="text-caption">Total Accounts</div>
                <div class="text-h4">{{ stats.totalAccounts }}</div>
              </div>
              <v-icon icon="mdi-account-multiple" size="48" />
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card color="success" variant="tonal">
          <v-card-text>
            <div class="d-flex align-center justify-space-between">
              <div>
                <div class="text-caption">Total Transfers</div>
                <div class="text-h4">{{ stats.totalTransfers }}</div>
              </div>
              <v-icon icon="mdi-bank-transfer" size="48" />
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card color="warning" variant="tonal">
          <v-card-text>
            <div class="d-flex align-center justify-space-between">
              <div>
                <div class="text-caption">Active Ledgers</div>
                <div class="text-h4">{{ stats.activeLedgers }}</div>
              </div>
              <v-icon icon="mdi-book-open-variant" size="48" />
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon icon="mdi-clock-outline" class="mr-2" />
            Recent Transfers (24h)
          </v-card-title>
          <v-card-text>
            <v-list v-if="recentTransfers.length > 0" density="compact">
              <v-list-item
                v-for="transfer in recentTransfers.slice(0, 5)"
                :key="transfer.id"
              >
                <template #prepend>
                  <v-icon icon="mdi-arrow-right" color="primary" />
                </template>
                <v-list-item-title>
                  {{
                    transfer.debit_alias ||
                    transfer.debit_account_id.substring(0, 12)
                  }}
                  →
                  {{
                    transfer.credit_alias ||
                    transfer.credit_account_id.substring(0, 12)
                  }}
                </v-list-item-title>
                <v-list-item-subtitle>
                  {{ formatAmountWithLedger(transfer.amount, transfer.ledger) }}
                  • {{ getTransferCodeName(transfer.ledger, transfer.code) }} •
                  {{ formatTimestamp(transfer.timestamp) }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
            <v-alert v-else type="info" variant="tonal">
              No recent transfers
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon icon="mdi-chart-bar" class="mr-2" />
            Top Accounts by Balance
          </v-card-title>
          <v-card-text>
            <v-list v-if="topAccounts.length > 0" density="compact">
              <v-list-item
                v-for="(account, index) in topAccounts.slice(0, 5)"
                :key="account.id"
              >
                <template #prepend>
                  <v-chip size="x-small" color="primary">{{
                    index + 1
                  }}</v-chip>
                </template>
                <v-list-item-title>{{ account.alias }}</v-list-item-title>
                <v-list-item-subtitle>
                  {{ getLedgerName(account.ledger) }} •
                  {{ getAccountCodeName(account.ledger, account.code) }}
                </v-list-item-subtitle>
                <template #append>
                  <v-chip
                    :color="getBalanceColor(account.balance)"
                    size="small"
                  >
                    {{
                      formatAmountWithLedger(account.balance, account.ledger)
                    }}
                  </v-chip>
                </template>
              </v-list-item>
            </v-list>
            <v-alert v-else type="info" variant="tonal">
              No accounts found
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon icon="mdi-heart-pulse" class="mr-2" />
            System Health
          </v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" md="3">
                <div class="text-center">
                  <v-icon
                    :icon="
                      isConnected ? 'mdi-check-circle' : 'mdi-close-circle'
                    "
                    :color="isConnected ? 'success' : 'error'"
                    size="48"
                  />
                  <div class="text-subtitle-2 mt-2">TigerBeetle Connection</div>
                  <div class="text-caption">
                    {{ isConnected ? "Connected" : "Disconnected" }}
                  </div>
                </div>
              </v-col>
              <v-col cols="12" md="3">
                <div class="text-center">
                  <v-icon icon="mdi-database" color="success" size="48" />
                  <div class="text-subtitle-2 mt-2">Local Database</div>
                  <div class="text-caption">Active</div>
                </div>
              </v-col>
              <v-col cols="12" md="3">
                <div class="text-center">
                  <v-icon icon="mdi-clock-check" color="info" size="48" />
                  <div class="text-subtitle-2 mt-2">Last Sync</div>
                  <div class="text-caption">{{ lastSyncTime }}</div>
                </div>
              </v-col>
              <v-col cols="12" md="3">
                <div class="text-center">
                  <v-icon icon="mdi-speedometer" color="warning" size="48" />
                  <div class="text-subtitle-2 mt-2">Performance</div>
                  <div class="text-caption">{{ avgResponseTime }}ms avg</div>
                </div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { useCurrency } from "@/composables/useCurrency";
import { formatTBAmount, isPositiveTBAmount } from "@/utils/bigint";
import { computed, onMounted, onUnmounted, ref } from "vue";

const {
  loadCurrency,
  getCurrencyForLedger,
  getLedgerName,
  getAccountCodeName,
  getTransferCodeName,
} = useCurrency();

interface Props {
  isConnected: boolean;
}

const props = defineProps<Props>();

const stats = ref({
  totalAccounts: 0,
  totalTransfers: 0,
  totalVolume: "0",
  activeLedgers: 0,
});

const recentTransfers = ref<any[]>([]);
const topAccounts = ref<any[]>([]);
const ledgerDistribution = ref<any[]>([]);
const transferActivity = ref<any[]>([]);
const lastSyncTime = ref("Never");
const avgResponseTime = ref(0);
const searchQuery = ref("");
const searchResults = ref<any[]>([]);

let refreshInterval: number | null = null;
let lastRefreshTime = 0;
const MIN_REFRESH_INTERVAL = 5000;

const maxDailyTransfers = computed(() => {
  return Math.max(...transferActivity.value.map((d) => d.count), 1);
});

onMounted(() => {
  loadDashboardData(true);

  refreshInterval = window.setInterval(() => {
    loadDashboardData();
  }, 60000);
});

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});

async function loadDashboardData(force: boolean = false) {
  if (!props.isConnected) return;

  const now = Date.now();
  if (
    !force &&
    lastRefreshTime &&
    now - lastRefreshTime < MIN_REFRESH_INTERVAL
  ) {
    return;
  }
  lastRefreshTime = now;

  loadCurrency();
  const startTime = Date.now();

  try {
    const accountsResult = await window.tigerBeetleApi.getAccounts(25, 0);
    if (accountsResult.success) {
      const data = accountsResult.data;
      const accounts =
        data && "data" in data ? data.data : (data as any[]) || [];

      stats.value.totalAccounts =
        data && "total" in data ? data.total : accounts.length;

      const sortedAccounts = [...accounts].sort((a, b) =>
        Number(BigInt(b.balance || "0") - BigInt(a.balance || "0"))
      );
      topAccounts.value = sortedAccounts.slice(0, 5);

      const ledgerMap = new Map<number, number>();
      accounts.forEach((acc: any) => {
        ledgerMap.set(acc.ledger, (ledgerMap.get(acc.ledger) || 0) + 1);
      });
      ledgerDistribution.value = Array.from(ledgerMap.entries())
        .map(([id, count]) => ({
          id,
          count,
          name: getLedgerName(id),
        }))
        .sort((a, b) => b.count - a.count);

      stats.value.activeLedgers = ledgerMap.size;
    }

    const transfersResult = await window.tigerBeetleApi.getTransfers(25, 0);
    if (transfersResult.success) {
      const data = transfersResult.data;
      const transfers =
        data && "data" in data ? data.data : (data as any[]) || [];

      stats.value.totalTransfers =
        data && "total" in data ? data.total : transfers.length;

      let totalVolume = BigInt(0);
      transfers.forEach((t: any) => {
        totalVolume += BigInt(t.amount || "0");
      });
      stats.value.totalVolume = totalVolume.toString();

      const now = BigInt(Date.now()) * BigInt(1000000);
      const oneDayAgo = now - BigInt(86400) * BigInt(1000000000);

      recentTransfers.value = transfers
        .filter((t: any) => {
          const timestamp = BigInt(t.timestamp || "0");
          return timestamp >= oneDayAgo;
        })
        .sort((a: any, b: any) => {
          const aTime = BigInt(a.timestamp || "0");
          const bTime = BigInt(b.timestamp || "0");
          return Number(bTime - aTime);
        })
        .slice(0, 10);

      calculateTransferActivity(transfers);
    }

    const endTime = Date.now();
    avgResponseTime.value = endTime - startTime;
    lastSyncTime.value = new Date().toLocaleTimeString();
  } catch (error) {}
}

function calculateTransferActivity(transfers: any[]) {
  const now = new Date();
  const activity: any[] = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const dayStart = BigInt(date.getTime()) * BigInt(1000000);
    const dayEnd = dayStart + BigInt(86400) * BigInt(1000000000);

    const count = transfers.filter((t: any) => {
      const timestamp = BigInt(t.timestamp || "0");
      return timestamp >= dayStart && timestamp < dayEnd;
    }).length;

    activity.push({
      date: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      count,
    });
  }

  transferActivity.value = activity;
}

function formatAmount(value: string | number): string {
  const strValue = typeof value === "string" ? value : value.toString();
  return formatTBAmount(strValue);
}

function formatAmountWithLedger(
  value: string | number,
  ledgerId: number
): string {
  const strValue = typeof value === "string" ? value : value.toString();
  const currency = getCurrencyForLedger(ledgerId);
  return formatTBAmount(strValue, currency);
}

function formatTimestamp(timestamp: string | number): string {
  try {
    const timestampBigInt = BigInt(timestamp);
    const milliseconds = Number(timestampBigInt / BigInt(1000000));
    const date = new Date(milliseconds);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  } catch {
    return "Unknown";
  }
}

async function onSearch() {
  if (!searchQuery.value || searchQuery.value.length < 3) {
    searchResults.value = [];
    return;
  }

  try {
    const query = searchQuery.value.toLowerCase();
    const [accountsResult, transfersResult] = await Promise.all([
      window.tigerBeetleApi.getAccounts(20, 0),
      window.tigerBeetleApi.getTransfers(20, 0),
    ]);

    const accountsData = accountsResult.success ? accountsResult.data : null;
    const accounts =
      accountsData && typeof accountsData === "object" && "data" in accountsData
        ? accountsData.data
        : Array.isArray(accountsData)
        ? accountsData
        : [];

    const transfersData = transfersResult.success ? transfersResult.data : null;
    const transfers =
      transfersData &&
      typeof transfersData === "object" &&
      "data" in transfersData
        ? transfersData.data
        : Array.isArray(transfersData)
        ? transfersData
        : [];

    const matchedAccounts = accounts.filter(
      (acc: any) =>
        acc.id?.toLowerCase().includes(query) ||
        acc.alias?.toLowerCase().includes(query)
    );

    const matchedTransfers = transfers.filter(
      (t: any) =>
        t.id?.toLowerCase().includes(query) ||
        t.debit_account_id?.toLowerCase().includes(query) ||
        t.credit_account_id?.toLowerCase().includes(query)
    );

    searchResults.value = [
      ...matchedAccounts.map((a: any) => ({ type: "account", data: a })),
      ...matchedTransfers.map((t: any) => ({ type: "transfer", data: t })),
    ];
  } catch (error) {
    searchResults.value = [];
  }
}

function getBalanceColor(balance: string): string {
  return isPositiveTBAmount(balance) ? "success" : "error";
}
</script>
