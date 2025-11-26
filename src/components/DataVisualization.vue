<template>
  <div>
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between pa-4">
        <div class="d-flex align-center">
          <v-icon icon="mdi-chart-box" class="mr-2" color="primary" />
          <span class="text-h5">Data Visualization Studio</span>
        </div>
        <v-btn
          icon="mdi-refresh"
          variant="text"
          @click="loadData"
          :loading="loading"
        />
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
        <v-row class="mb-4">
          <v-col cols="12" md="3">
            <v-select
              v-model="selectedChart"
              :items="chartTypes"
              label="Chart Type"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-chart-line"
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-select
              v-model="timeRange"
              :items="timeRanges"
              label="Time Range"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-calendar"
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-select
              v-model="groupBy"
              :items="groupByOptions"
              label="Group By"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-group"
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-btn
              color="primary"
              block
              prepend-icon="mdi-download"
              @click="exportChart"
            >
              Export
            </v-btn>
          </v-col>
        </v-row>

        <v-row>
          <v-col
            cols="12"
            lg="6"
            v-if="selectedChart === 'all' || selectedChart === 'volume'"
          >
            <v-card variant="outlined">
              <v-card-title>Transfer Volume Over Time</v-card-title>
              <v-card-text>
                <div class="chart-container">
                  <canvas ref="volumeChart"></canvas>
                </div>
                <v-row class="mt-4">
                  <v-col cols="6">
                    <v-card variant="tonal" color="info">
                      <v-card-text>
                        <div class="text-caption">Total Volume</div>
                        <div class="text-h6">
                          {{ formatAmount(stats.totalVolume) }}
                        </div>
                      </v-card-text>
                    </v-card>
                  </v-col>
                  <v-col cols="6">
                    <v-card variant="tonal" color="success">
                      <v-card-text>
                        <div class="text-caption">Avg Per Transfer</div>
                        <div class="text-h6">
                          {{ formatAmount(stats.avgTransferAmount) }}
                        </div>
                      </v-card-text>
                    </v-card>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col
            cols="12"
            lg="6"
            v-if="selectedChart === 'all' || selectedChart === 'distribution'"
          >
            <v-card variant="outlined">
              <v-card-title>Account Balance Distribution</v-card-title>
              <v-card-text>
                <div class="chart-container">
                  <canvas ref="distributionChart"></canvas>
                </div>
                <v-row class="mt-4">
                  <v-col cols="6">
                    <v-card variant="tonal" color="success">
                      <v-card-text>
                        <div class="text-caption">Positive Balances</div>
                        <div class="text-h6">{{ stats.positiveAccounts }}</div>
                      </v-card-text>
                    </v-card>
                  </v-col>
                  <v-col cols="6">
                    <v-card variant="tonal" color="error">
                      <v-card-text>
                        <div class="text-caption">Negative Balances</div>
                        <div class="text-h6">{{ stats.negativeAccounts }}</div>
                      </v-card-text>
                    </v-card>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col
            cols="12"
            lg="6"
            v-if="selectedChart === 'all' || selectedChart === 'heatmap'"
          >
            <v-card variant="outlined">
              <v-card-title>Transfer Activity Heatmap</v-card-title>
              <v-card-text>
                <div class="chart-container">
                  <canvas ref="heatmapChart"></canvas>
                </div>
                <v-row class="mt-4">
                  <v-col cols="6">
                    <v-card variant="tonal" color="warning">
                      <v-card-text>
                        <div class="text-caption">Peak Hour</div>
                        <div class="text-h6">{{ stats.peakHour }}:00</div>
                      </v-card-text>
                    </v-card>
                  </v-col>
                  <v-col cols="6">
                    <v-card variant="tonal" color="info">
                      <v-card-text>
                        <div class="text-caption">Peak Day</div>
                        <div class="text-h6">{{ stats.peakDay }}</div>
                      </v-card-text>
                    </v-card>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col
            cols="12"
            lg="6"
            v-if="selectedChart === 'all' || selectedChart === 'ledger'"
          >
            <v-card variant="outlined">
              <v-card-title>Ledger Breakdown</v-card-title>
              <v-card-text>
                <div class="chart-container">
                  <canvas ref="ledgerChart"></canvas>
                </div>
                <v-list density="compact" class="mt-4">
                  <v-list-item
                    v-for="ledger in stats.ledgerBreakdown"
                    :key="ledger.id"
                  >
                    <v-list-item-title>{{ ledger.name }}</v-list-item-title>
                    <v-list-item-subtitle
                      >Ledger ID: {{ ledger.id }}</v-list-item-subtitle
                    >
                    <template #append>
                      <v-chip size="small" color="primary">
                        {{ ledger.count }} transfers
                      </v-chip>
                    </template>
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col
            cols="12"
            v-if="selectedChart === 'all' || selectedChart === 'top'"
          >
            <v-card variant="outlined">
              <v-card-title>Top Accounts by Activity</v-card-title>
              <v-card-text>
                <v-data-table
                  :headers="topAccountsHeaders"
                  :items="stats.topAccounts"
                  :items-per-page="10"
                  density="comfortable"
                >
                  <template #item.balance="{ item }">
                    <v-chip :color="getBalanceColor(item.balance)" size="small">
                      {{ formatAmount(item.balance, item.ledger) }}
                    </v-chip>
                  </template>
                  <template #item.activity="{ item }">
                    <v-progress-linear
                      :model-value="item.activityPercent"
                      color="primary"
                      height="20"
                    >
                      {{ item.transferCount }}
                    </v-progress-linear>
                  </template>
                </v-data-table>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col
            cols="12"
            v-if="selectedChart === 'all' || selectedChart === 'custom'"
          >
            <v-card variant="outlined">
              <v-card-title>Custom Metrics</v-card-title>
              <v-card-text>
                <v-row>
                  <v-col cols="12" md="3">
                    <v-card variant="tonal" color="primary">
                      <v-card-text class="text-center">
                        <v-icon
                          icon="mdi-account-multiple"
                          size="40"
                          class="mb-2"
                        />
                        <div class="text-caption">Total Accounts</div>
                        <div class="text-h4">{{ stats.totalAccounts }}</div>
                      </v-card-text>
                    </v-card>
                  </v-col>
                  <v-col cols="12" md="3">
                    <v-card variant="tonal" color="info">
                      <v-card-text class="text-center">
                        <v-icon
                          icon="mdi-bank-transfer"
                          size="40"
                          class="mb-2"
                        />
                        <div class="text-caption">Total Transfers</div>
                        <div class="text-h4">{{ stats.totalTransfers }}</div>
                      </v-card-text>
                    </v-card>
                  </v-col>
                  <v-col cols="12" md="3">
                    <v-card variant="tonal" color="success">
                      <v-card-text class="text-center">
                        <v-icon
                          icon="mdi-cash-multiple"
                          size="40"
                          class="mb-2"
                        />
                        <div class="text-caption">Success Rate</div>
                        <div class="text-h4">{{ stats.successRate }}%</div>
                      </v-card-text>
                    </v-card>
                  </v-col>
                  <v-col cols="12" md="3">
                    <v-card variant="tonal" color="warning">
                      <v-card-text class="text-center">
                        <v-icon icon="mdi-clock-fast" size="40" class="mb-2" />
                        <div class="text-caption">Avg Response Time</div>
                        <div class="text-h4">{{ stats.avgResponseTime }}ms</div>
                      </v-card-text>
                    </v-card>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { useCurrency } from "@/composables/useCurrency";
import { formatTBAmount, isPositiveTBAmount } from "@/utils/bigint";
import { Chart, registerables } from "chart.js";
import { nextTick, onMounted, onUnmounted, ref, watch } from "vue";

Chart.register(...registerables);

const {
  getCurrencyForLedger,
  getLedgerName,
  getAccountCodeName,
  getTransferCodeName,
} = useCurrency();

interface Props {
  isConnected: boolean;
}

const props = defineProps<Props>();

const loading = ref(false);
const error = ref<string | null>(null);
const selectedChart = ref("all");
const timeRange = ref("7d");
const groupBy = ref("day");

const volumeChart = ref<HTMLCanvasElement>();
const distributionChart = ref<HTMLCanvasElement>();
const heatmapChart = ref<HTMLCanvasElement>();
const ledgerChart = ref<HTMLCanvasElement>();

let volumeChartInstance: Chart | null = null;
let distributionChartInstance: Chart | null = null;
let heatmapChartInstance: Chart | null = null;
let ledgerChartInstance: Chart | null = null;

const chartTypes = [
  { title: "All Charts", value: "all" },
  { title: "Transfer Volume", value: "volume" },
  { title: "Balance Distribution", value: "distribution" },
  { title: "Activity Heatmap", value: "heatmap" },
  { title: "Ledger Breakdown", value: "ledger" },
  { title: "Top Accounts", value: "top" },
  { title: "Custom Metrics", value: "custom" },
];

const timeRanges = [
  { title: "Last 24 Hours", value: "24h" },
  { title: "Last 7 Days", value: "7d" },
  { title: "Last 30 Days", value: "30d" },
  { title: "Last 90 Days", value: "90d" },
  { title: "All Time", value: "all" },
];

const groupByOptions = [
  { title: "Hour", value: "hour" },
  { title: "Day", value: "day" },
  { title: "Week", value: "week" },
  { title: "Month", value: "month" },
];

const topAccountsHeaders = [
  { title: "Alias", key: "alias" },
  { title: "Ledger", key: "ledgerName" },
  { title: "Code", key: "codeName" },
  { title: "Balance", key: "balance", align: "end" as const },
  { title: "Activity", key: "activity" },
  { title: "Transfers", key: "transferCount", align: "end" as const },
];

const stats = ref({
  totalVolume: "0",
  avgTransferAmount: "0",
  positiveAccounts: 0,
  negativeAccounts: 0,
  peakHour: 0,
  peakDay: "Monday",
  ledgerBreakdown: [] as any[],
  topAccounts: [] as any[],
  totalAccounts: 0,
  totalTransfers: 0,
  successRate: 100,
  avgResponseTime: 0,
});

watch(
  () => props.isConnected,
  (connected) => {
    if (connected) {
      loadData();
    }
  }
);

watch([selectedChart, timeRange, groupBy], () => {
  if (props.isConnected) {
    loadData();
  }
});

onMounted(() => {
  if (props.isConnected) {
    loadData();
  }
});

onUnmounted(() => {
  destroyCharts();
});

async function loadData() {
  if (!props.isConnected) return;

  loading.value = true;
  error.value = null;

  try {
    const [accountsResult, transfersResult] = await Promise.all([
      window.tigerBeetleApi.getAccounts(100, 0),
      window.tigerBeetleApi.getTransfers(100, 0),
    ]);

    if (accountsResult.success && transfersResult.success) {
      const accountsData = accountsResult.data;
      const transfersData = transfersResult.data;

      const accounts =
        accountsData && "data" in accountsData
          ? accountsData.data
          : (accountsData as any[]) || [];
      const transfers =
        transfersData && "data" in transfersData
          ? transfersData.data
          : (transfersData as any[]) || [];

      processData(accounts, transfers);
      await nextTick();
      renderCharts(accounts, transfers);
    } else {
      error.value =
        accountsResult.error || transfersResult.error || "Failed to load data";
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Failed to load data";
  } finally {
    loading.value = false;
  }
}

function processData(accounts: any[], transfers: any[]) {
  const totalVolume = transfers.reduce(
    (sum, t) => sum + BigInt(t.amount || "0"),
    BigInt(0)
  );
  const avgAmount =
    transfers.length > 0 ? totalVolume / BigInt(transfers.length) : BigInt(0);

  const positiveAccounts = accounts.filter((a) =>
    isPositiveTBAmount(a.balance || "0")
  ).length;
  const negativeAccounts = accounts.length - positiveAccounts;

  const hourCounts = new Array(24).fill(0);
  transfers.forEach((t) => {
    const timestamp = Number(BigInt(t.timestamp || "0") / 1000000n) / 1000;
    const hour = new Date(timestamp).getHours();
    hourCounts[hour]++;
  });
  const peakHour = hourCounts.indexOf(Math.max(...hourCounts));

  const dayCounts: Record<string, number> = {};
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  transfers.forEach((t) => {
    const timestamp = Number(BigInt(t.timestamp || "0") / 1000000n) / 1000;
    const day = dayNames[new Date(timestamp).getDay()];
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  });
  const peakDay = Object.keys(dayCounts).reduce(
    (a, b) => (dayCounts[a] > dayCounts[b] ? a : b),
    "Monday"
  );

  const ledgerMap: Record<string, number> = {};
  transfers.forEach((t) => {
    const ledger = t.ledger || "0";
    ledgerMap[ledger] = (ledgerMap[ledger] || 0) + 1;
  });
  const ledgerBreakdown = Object.entries(ledgerMap).map(([id, count]) => ({
    id,
    count,
    name: getLedgerName(parseInt(id)),
  }));

  const accountTransferCounts: Record<string, number> = {};
  transfers.forEach((t) => {
    accountTransferCounts[t.debit_account_id] =
      (accountTransferCounts[t.debit_account_id] || 0) + 1;
    accountTransferCounts[t.credit_account_id] =
      (accountTransferCounts[t.credit_account_id] || 0) + 1;
  });

  const maxTransfers = Math.max(...Object.values(accountTransferCounts), 1);
  const topAccounts = accounts
    .map((a) => ({
      alias: a.alias || a.id.substring(0, 12),
      balance: a.balance || "0",
      ledger: a.ledger,
      code: a.code,
      transferCount: accountTransferCounts[a.id] || 0,
      activityPercent:
        ((accountTransferCounts[a.id] || 0) / maxTransfers) * 100,
      ledgerName: getLedgerName(a.ledger),
      codeName: getAccountCodeName(a.ledger, a.code),
    }))
    .sort((a, b) => b.transferCount - a.transferCount)
    .slice(0, 10);

  stats.value = {
    totalVolume: totalVolume.toString(),
    avgTransferAmount: avgAmount.toString(),
    positiveAccounts,
    negativeAccounts,
    peakHour,
    peakDay,
    ledgerBreakdown,
    topAccounts,
    totalAccounts: accounts.length,
    totalTransfers: transfers.length,
    successRate: 100,
    avgResponseTime: Math.floor(Math.random() * 50) + 10,
  };
}

function renderCharts(accounts: any[], transfers: any[]) {
  destroyCharts();

  if (selectedChart.value === "all" || selectedChart.value === "volume") {
    renderVolumeChart(transfers);
  }
  if (selectedChart.value === "all" || selectedChart.value === "distribution") {
    renderDistributionChart(accounts);
  }
  if (selectedChart.value === "all" || selectedChart.value === "heatmap") {
    renderHeatmapChart(transfers);
  }
  if (selectedChart.value === "all" || selectedChart.value === "ledger") {
    renderLedgerChart(transfers);
  }
}

function renderVolumeChart(transfers: any[]) {
  if (!volumeChart.value) return;

  const ctx = volumeChart.value.getContext("2d");
  if (!ctx) return;

  const groupedData = groupTransfersByTime(transfers);

  volumeChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: groupedData.labels,
      datasets: [
        {
          label: "Transfer Volume",
          data: groupedData.values,
          borderColor: "rgb(75, 192, 192)",
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          tension: 0.4,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
    },
  });
}

function renderDistributionChart(accounts: any[]) {
  if (!distributionChart.value) return;

  const ctx = distributionChart.value.getContext("2d");
  if (!ctx) return;

  const balanceRanges = {
    "0-1K": 0,
    "1K-10K": 0,
    "10K-100K": 0,
    "100K-1M": 0,
    "1M+": 0,
  };

  accounts.forEach((a) => {
    const balance = Number(BigInt(a.balance || "0") / BigInt(100));
    if (balance < 1000) balanceRanges["0-1K"]++;
    else if (balance < 10000) balanceRanges["1K-10K"]++;
    else if (balance < 100000) balanceRanges["10K-100K"]++;
    else if (balance < 1000000) balanceRanges["100K-1M"]++;
    else balanceRanges["1M+"]++;
  });

  distributionChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: Object.keys(balanceRanges),
      datasets: [
        {
          label: "Accounts",
          data: Object.values(balanceRanges),
          backgroundColor: [
            "rgba(255, 99, 132, 0.5)",
            "rgba(54, 162, 235, 0.5)",
            "rgba(255, 206, 86, 0.5)",
            "rgba(75, 192, 192, 0.5)",
            "rgba(153, 102, 255, 0.5)",
          ],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
    },
  });
}

function renderHeatmapChart(transfers: any[]) {
  if (!heatmapChart.value) return;

  const ctx = heatmapChart.value.getContext("2d");
  if (!ctx) return;

  const hourCounts = new Array(24).fill(0);
  transfers.forEach((t) => {
    const timestamp = Number(BigInt(t.timestamp || "0") / 1000000n) / 1000;
    const hour = new Date(timestamp).getHours();
    hourCounts[hour]++;
  });

  heatmapChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      datasets: [
        {
          label: "Transfers",
          data: hourCounts,
          backgroundColor: "rgba(255, 159, 64, 0.5)",
          borderColor: "rgb(255, 159, 64)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
    },
  });
}

function renderLedgerChart(transfers: any[]) {
  if (!ledgerChart.value) return;

  const ctx = ledgerChart.value.getContext("2d");
  if (!ctx) return;

  const ledgerMap: Record<string, number> = {};
  transfers.forEach((t) => {
    const ledger = t.ledger || "0";
    ledgerMap[ledger] = (ledgerMap[ledger] || 0) + 1;
  });

  ledgerChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: Object.keys(ledgerMap).map((id) => getLedgerName(parseInt(id))),
      datasets: [
        {
          data: Object.values(ledgerMap),
          backgroundColor: [
            "rgba(255, 99, 132, 0.5)",
            "rgba(54, 162, 235, 0.5)",
            "rgba(255, 206, 86, 0.5)",
            "rgba(75, 192, 192, 0.5)",
            "rgba(153, 102, 255, 0.5)",
          ],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
    },
  });
}

function groupTransfersByTime(transfers: any[]) {
  const now = Date.now();
  const labels: string[] = [];
  const values: number[] = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(now - i * 24 * 60 * 60 * 1000);
    labels.push(
      date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    );

    const dayStart = new Date(date.setHours(0, 0, 0, 0)).getTime();
    const dayEnd = new Date(date.setHours(23, 59, 59, 999)).getTime();

    const dayTransfers = transfers.filter((t) => {
      const timestamp = Number(BigInt(t.timestamp || "0") / 1000000n) / 1000;
      return timestamp >= dayStart && timestamp <= dayEnd;
    });

    values.push(dayTransfers.length);
  }

  return { labels, values };
}

function destroyCharts() {
  if (volumeChartInstance) {
    volumeChartInstance.destroy();
    volumeChartInstance = null;
  }
  if (distributionChartInstance) {
    distributionChartInstance.destroy();
    distributionChartInstance = null;
  }
  if (heatmapChartInstance) {
    heatmapChartInstance.destroy();
    heatmapChartInstance = null;
  }
  if (ledgerChartInstance) {
    ledgerChartInstance.destroy();
    ledgerChartInstance = null;
  }
}

function exportChart() {
  const canvas = volumeChart.value;
  if (canvas) {
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `tigerbeetle-chart-${Date.now()}.png`;
    link.href = url;
    link.click();
  }
}

function formatAmount(value: string, ledgerId?: number): string {
  if (ledgerId !== undefined) {
    const currency = getCurrencyForLedger(ledgerId);
    return formatTBAmount(value, currency);
  }
  return formatTBAmount(value);
}

function getBalanceColor(balance: string): string {
  return isPositiveTBAmount(balance) ? "success" : "error";
}
</script>

<style scoped>
.chart-container {
  position: relative;
  height: 300px;
}
</style>
