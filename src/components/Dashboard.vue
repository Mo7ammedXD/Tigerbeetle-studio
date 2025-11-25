<template>
  <div>
    <v-row>
      
      <v-col cols="12" md="3">
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

      <v-col cols="12" md="3">
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

      <v-col cols="12" md="3">
        <v-card color="info" variant="tonal">
          <v-card-text>
            <div class="d-flex align-center justify-space-between">
              <div>
                <div class="text-caption">Total Volume</div>
                <div class="text-h5">{{ formatAmount(stats.totalVolume) }}</div>
              </div>
              <v-icon icon="mdi-currency-usd" size="48" />
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="3">
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
                  {{ formatAmount(transfer.amount) }} •
                  {{ formatTime(transfer.created_at) }}
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
                  Ledger {{ account.ledger }} • Code {{ account.code }}
                </v-list-item-subtitle>
                <template #append>
                  <v-chip
                    :color="getBalanceColor(account.balance)"
                    size="small"
                  >
                    {{ formatAmount(account.balance) }}
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

      
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon icon="mdi-chart-pie" class="mr-2" />
            Accounts by Ledger
          </v-card-title>
          <v-card-text>
            <div v-if="ledgerDistribution.length > 0">
              <v-list density="compact">
                <v-list-item
                  v-for="ledger in ledgerDistribution"
                  :key="ledger.id"
                >
                  <v-list-item-title>Ledger {{ ledger.id }}</v-list-item-title>
                  <template #append>
                    <v-chip size="small">{{ ledger.count }} accounts</v-chip>
                  </template>
                </v-list-item>
              </v-list>
            </div>
            <v-alert v-else type="info" variant="tonal">
              No data available
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>

      
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon icon="mdi-chart-line" class="mr-2" />
            Transfer Activity (Last 7 Days)
          </v-card-title>
          <v-card-text>
            <div v-if="transferActivity.length > 0" class="pa-4">
              <div v-for="day in transferActivity" :key="day.date" class="mb-3">
                <div class="d-flex justify-space-between mb-1">
                  <span class="text-caption">{{ day.date }}</span>
                  <span class="text-caption font-weight-bold"
                    >{{ day.count }} transfers</span
                  >
                </div>
                <v-progress-linear
                  :model-value="(day.count / maxDailyTransfers) * 100"
                  color="primary"
                  height="8"
                />
              </div>
            </div>
            <v-alert v-else type="info" variant="tonal">
              No transfer activity
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

const { loadCurrency, globalCurrency } = useCurrency();

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

let refreshInterval: number | null = null;

const maxDailyTransfers = computed(() => {
  return Math.max(...transferActivity.value.map((d) => d.count), 1);
});

onMounted(() => {
  loadDashboardData();
  
  refreshInterval = window.setInterval(() => {
    loadDashboardData();
  }, 30000);
});

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});

async function loadDashboardData() {
  if (!props.isConnected) return;

  loadCurrency();
  const startTime = Date.now();

  try {
    
    const accountsResult = await window.tigerBeetleApi.getAccounts(1000, 0);
    if (accountsResult.success) {
      const data = accountsResult.data;
      const accounts =
        data && "data" in data ? data.data : (data as any[]) || [];

      stats.value.totalAccounts =
        data && "total" in data ? data.total : accounts.length;

      
      const sortedAccounts = [...accounts].sort((a, b) =>
        Number(BigInt(b.balance || "0") - BigInt(a.balance || "0"))
      );
      topAccounts.value = sortedAccounts.slice(0, 10);

      
      const ledgerMap = new Map<number, number>();
      accounts.forEach((acc: any) => {
        ledgerMap.set(acc.ledger, (ledgerMap.get(acc.ledger) || 0) + 1);
      });
      ledgerDistribution.value = Array.from(ledgerMap.entries())
        .map(([id, count]) => ({ id, count }))
        .sort((a, b) => b.count - a.count);

      stats.value.activeLedgers = ledgerMap.size;
    }

    
    const transfersResult = await window.tigerBeetleApi.getTransfers(1000, 0);
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
      stats.value.totalVolume = formatTBAmount(
        totalVolume.toString(),
        globalCurrency.value
      );

      
      const now = Date.now() / 1000;
      const oneDayAgo = now - 86400;
      recentTransfers.value = transfers
        .filter((t: any) => t.created_at >= oneDayAgo)
        .sort((a: any, b: any) => b.created_at - a.created_at);

      
      calculateTransferActivity(transfers);
    }

    const endTime = Date.now();
    avgResponseTime.value = endTime - startTime;
    lastSyncTime.value = new Date().toLocaleTimeString();
  } catch (error) {
  }
}

function calculateTransferActivity(transfers: any[]) {
  const now = new Date();
  const activity: any[] = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const dayStart = date.getTime() / 1000;
    const dayEnd = dayStart + 86400;

    const count = transfers.filter(
      (t: any) => t.created_at >= dayStart && t.created_at < dayEnd
    ).length;

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

function formatTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function getBalanceColor(balance: string): string {
  return isPositiveTBAmount(balance) ? "success" : "error";
}
</script>
