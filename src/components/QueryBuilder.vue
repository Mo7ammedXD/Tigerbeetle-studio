<template>
  <div>
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between pa-4">
        <div class="d-flex align-center">
          <v-icon icon="mdi-database-search" class="mr-2" color="primary" />
          <span class="text-h5">Query Builder</span>
        </div>
        <v-btn
          icon="mdi-help-circle"
          variant="text"
          @click="showHelp = !showHelp"
        />
      </v-card-title>

      <v-alert v-if="showHelp" type="info" variant="tonal" class="ma-4">
        <div class="text-subtitle-2 mb-2">Query Builder Help</div>
        <ul class="text-body-2">
          <li>Select entity type (Accounts or Transfers)</li>
          <li>Apply filters to narrow down results</li>
          <li>Execute query to see results</li>
          <li>Export results to CSV or JSON</li>
          <li>Save queries for later use</li>
        </ul>
      </v-alert>

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
        <v-expansion-panels v-model="panel" multiple>
          <v-expansion-panel value="filters">
            <v-expansion-panel-title>
              <v-icon icon="mdi-filter" class="mr-2" />
              Filters
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-row>
                <v-col cols="12" md="6">
                  <v-select
                    v-model="query.entity"
                    :items="['Accounts', 'Transfers']"
                    label="Entity Type *"
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-table"
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model.number="query.ledger"
                    label="Ledger"
                    type="number"
                    variant="outlined"
                    density="comfortable"
                    clearable
                    prepend-inner-icon="mdi-book-open-variant"
                    hint="Filter by specific ledger"
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model.number="query.code"
                    label="Code"
                    type="number"
                    variant="outlined"
                    density="comfortable"
                    clearable
                    prepend-inner-icon="mdi-code-tags"
                    hint="Filter by account/transfer code"
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="query.accountId"
                    label="Account ID"
                    variant="outlined"
                    density="comfortable"
                    clearable
                    prepend-inner-icon="mdi-identifier"
                    hint="Specific account ID"
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="query.dateFrom"
                    label="From Date"
                    type="datetime-local"
                    variant="outlined"
                    density="comfortable"
                    clearable
                    prepend-inner-icon="mdi-calendar-start"
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="query.dateTo"
                    label="To Date"
                    type="datetime-local"
                    variant="outlined"
                    density="comfortable"
                    clearable
                    prepend-inner-icon="mdi-calendar-end"
                  />
                </v-col>

                <v-col cols="12" md="6" v-if="query.entity === 'Accounts'">
                  <v-text-field
                    v-model="query.minBalance"
                    label="Min Balance"
                    variant="outlined"
                    density="comfortable"
                    clearable
                    prepend-inner-icon="mdi-currency-usd"
                    hint="Minimum balance (e.g., 100.00)"
                  />
                </v-col>

                <v-col cols="12" md="6" v-if="query.entity === 'Accounts'">
                  <v-text-field
                    v-model="query.maxBalance"
                    label="Max Balance"
                    variant="outlined"
                    density="comfortable"
                    clearable
                    prepend-inner-icon="mdi-currency-usd"
                    hint="Maximum balance (e.g., 10000.00)"
                  />
                </v-col>

                <v-col cols="12" md="6" v-if="query.entity === 'Transfers'">
                  <v-text-field
                    v-model="query.minAmount"
                    label="Min Amount"
                    variant="outlined"
                    density="comfortable"
                    clearable
                    prepend-inner-icon="mdi-currency-usd"
                    hint="Minimum transfer amount"
                  />
                </v-col>

                <v-col cols="12" md="6" v-if="query.entity === 'Transfers'">
                  <v-text-field
                    v-model="query.maxAmount"
                    label="Max Amount"
                    variant="outlined"
                    density="comfortable"
                    clearable
                    prepend-inner-icon="mdi-currency-usd"
                    hint="Maximum transfer amount"
                  />
                </v-col>

                <v-col cols="12">
                  <v-text-field
                    v-model="query.searchText"
                    label="Search (Alias)"
                    variant="outlined"
                    density="comfortable"
                    clearable
                    prepend-inner-icon="mdi-magnify"
                    hint="Search in account aliases"
                  />
                </v-col>
              </v-row>
            </v-expansion-panel-text>
          </v-expansion-panel>

          <v-expansion-panel value="options">
            <v-expansion-panel-title>
              <v-icon icon="mdi-cog" class="mr-2" />
              Options
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-row>
                <v-col cols="12" md="6">
                  <v-select
                    v-model="query.limit"
                    :items="[50, 100, 200, 500, 1000]"
                    label="Result Limit"
                    variant="outlined"
                    density="comfortable"
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-select
                    v-model="query.sortBy"
                    :items="sortOptions"
                    label="Sort By"
                    variant="outlined"
                    density="comfortable"
                  />
                </v-col>
              </v-row>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>

        <!-- Action Buttons -->
        <v-card-actions class="px-0 pt-4">
          <v-btn
            color="primary"
            prepend-icon="mdi-play"
            @click="executeQuery"
            :loading="loading"
            :disabled="!query.entity"
          >
            Execute Query
          </v-btn>
          <v-btn
            variant="outlined"
            prepend-icon="mdi-refresh"
            @click="resetQuery"
          >
            Reset
          </v-btn>
          <v-spacer />
          <v-btn
            variant="outlined"
            prepend-icon="mdi-content-save"
            @click="saveQuery"
            :disabled="!query.entity"
          >
            Save Query
          </v-btn>
          <v-menu>
            <template v-slot:activator="{ props }">
              <v-btn
                variant="outlined"
                prepend-icon="mdi-download"
                v-bind="props"
                :disabled="results.length === 0"
              >
                Export
              </v-btn>
            </template>
            <v-list>
              <v-list-item @click="exportResults('csv')">
                <v-list-item-title>
                  <v-icon icon="mdi-file-delimited" class="mr-2" />
                  Export as CSV
                </v-list-item-title>
              </v-list-item>
              <v-list-item @click="exportResults('json')">
                <v-list-item-title>
                  <v-icon icon="mdi-code-json" class="mr-2" />
                  Export as JSON
                </v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </v-card-actions>

        <!-- Results -->
        <v-divider class="my-4" />

        <div v-if="results.length > 0">
          <div class="d-flex align-center mb-4">
            <v-icon icon="mdi-table-search" class="mr-2" color="success" />
            <span class="text-h6">Results</span>
            <v-chip class="ml-3" size="small" color="success">
              {{ results.length }} records
            </v-chip>
          </div>

          <v-data-table
            :headers="resultHeaders"
            :items="results"
            :items-per-page="25"
            density="comfortable"
            class="elevation-1"
          >
            <template
              #item.balance="{ item }"
              v-if="query.entity === 'Accounts'"
            >
              <v-chip
                :color="getBalanceColor(item.balance)"
                variant="flat"
                size="small"
              >
                {{ formatAmount(item.balance, item.ledger) }}
              </v-chip>
            </template>

            <template
              #item.amount="{ item }"
              v-if="query.entity === 'Transfers'"
            >
              <span class="font-mono">{{
                formatAmount(item.amount, item.ledger)
              }}</span>
            </template>

            <template #item.timestamp="{ item }">
              {{ formatTimestamp(item.timestamp) }}
            </template>

            <template #item.flags="{ item }">
              <v-chip
                v-for="flag in item.flags"
                :key="flag"
                size="x-small"
                class="mr-1"
                color="info"
              >
                {{ flag }}
              </v-chip>
            </template>
          </v-data-table>
        </div>

        <v-alert v-else-if="!loading && executed" type="info" variant="tonal">
          No results found. Try adjusting your filters.
        </v-alert>
      </v-card-text>
    </v-card>

    <!-- Saved Queries Dialog -->
    <v-dialog v-model="showSavedQueries" max-width="600">
      <v-card>
        <v-card-title>Saved Queries</v-card-title>
        <v-card-text>
          <v-list v-if="savedQueries.length > 0">
            <v-list-item
              v-for="(saved, index) in savedQueries"
              :key="index"
              @click="loadSavedQuery(saved)"
            >
              <v-list-item-title>{{ saved.name }}</v-list-item-title>
              <v-list-item-subtitle
                >{{ saved.entity }} -
                {{ saved.description }}</v-list-item-subtitle
              >
              <template v-slot:append>
                <v-btn
                  icon="mdi-delete"
                  variant="text"
                  size="small"
                  @click.stop="deleteSavedQuery(index)"
                />
              </template>
            </v-list-item>
          </v-list>
          <v-alert v-else type="info" variant="tonal">
            No saved queries yet.
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="showSavedQueries = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { useCurrency } from "@/composables/useCurrency";
import {
  formatTBAmount,
  formatTBTimestamp,
  isPositiveTBAmount,
  parseTBAmount,
} from "@/utils/bigint";
import { computed, onMounted, ref } from "vue";

const { getCurrencyForLedger, loadCurrency } = useCurrency();

interface Props {
  isConnected: boolean;
}

const props = defineProps<Props>();

const loading = ref(false);
const error = ref<string | null>(null);
const showHelp = ref(false);
const panel = ref(["filters"]);
const executed = ref(false);
const showSavedQueries = ref(false);

const query = ref({
  entity: "Accounts" as "Accounts" | "Transfers",
  ledger: null as number | null,
  code: null as number | null,
  accountId: "",
  dateFrom: "",
  dateTo: "",
  minBalance: "",
  maxBalance: "",
  minAmount: "",
  maxAmount: "",
  searchText: "",
  limit: 100,
  sortBy: "created_at_desc",
});

const results = ref<any[]>([]);
const savedQueries = ref<any[]>([]);

const sortOptions = computed(() => {
  if (query.value.entity === "Accounts") {
    return [
      { title: "Created (Newest)", value: "created_at_desc" },
      { title: "Created (Oldest)", value: "created_at_asc" },
      { title: "Balance (High to Low)", value: "balance_desc" },
      { title: "Balance (Low to High)", value: "balance_asc" },
      { title: "Alias (A-Z)", value: "alias_asc" },
    ];
  } else {
    return [
      { title: "Created (Newest)", value: "created_at_desc" },
      { title: "Created (Oldest)", value: "created_at_asc" },
      { title: "Amount (High to Low)", value: "amount_desc" },
      { title: "Amount (Low to High)", value: "amount_asc" },
    ];
  }
});

const resultHeaders = computed(() => {
  if (query.value.entity === "Accounts") {
    return [
      { title: "Alias", key: "alias" },
      { title: "ID", key: "id" },
      { title: "Ledger", key: "ledger" },
      { title: "Code", key: "code" },
      { title: "Balance", key: "balance", align: "end" },
      { title: "Flags", key: "flags" },
      { title: "Timestamp", key: "timestamp" },
    ];
  } else {
    return [
      { title: "ID", key: "id" },
      { title: "From", key: "debit_alias" },
      { title: "To", key: "credit_alias" },
      { title: "Amount", key: "amount", align: "end" },
      { title: "Ledger", key: "ledger" },
      { title: "Code", key: "code" },
      { title: "Flags", key: "flags" },
      { title: "Timestamp", key: "timestamp" },
    ];
  }
});

async function executeQuery() {
  if (!props.isConnected) return;

  loadCurrency();
  loading.value = true;
  error.value = null;
  executed.value = true;

  try {
    let data: any[] = [];

    if (query.value.entity === "Accounts") {
      const result = await window.tigerBeetleApi.getAccounts(
        query.value.limit,
        0
      );
      if (result.success) {
        const responseData = result.data;
        data =
          responseData && "data" in responseData
            ? responseData.data
            : (responseData as any[]) || [];
      } else {
        error.value = result.error || "Failed to fetch accounts";
        return;
      }
    } else {
      const result = await window.tigerBeetleApi.getTransfers(
        query.value.limit,
        0
      );
      if (result.success) {
        const responseData = result.data;
        data =
          responseData && "data" in responseData
            ? responseData.data
            : (responseData as any[]) || [];
      } else {
        error.value = result.error || "Failed to fetch transfers";
        return;
      }
    }

    // Apply filters
    results.value = applyFilters(data);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Query execution failed";
  } finally {
    loading.value = false;
  }
}

function applyFilters(data: any[]): any[] {
  let filtered = [...data];

  // Filter by ledger
  if (query.value.ledger !== null) {
    filtered = filtered.filter((item) => item.ledger === query.value.ledger);
  }

  // Filter by code
  if (query.value.code !== null) {
    filtered = filtered.filter((item) => item.code === query.value.code);
  }

  // Filter by account ID
  if (query.value.accountId) {
    filtered = filtered.filter((item) => item.id === query.value.accountId);
  }

  // Filter by search text (alias)
  if (query.value.searchText) {
    const searchLower = query.value.searchText.toLowerCase();
    filtered = filtered.filter(
      (item) =>
        item.alias?.toLowerCase().includes(searchLower) ||
        item.debit_alias?.toLowerCase().includes(searchLower) ||
        item.credit_alias?.toLowerCase().includes(searchLower)
    );
  }

  // Filter by date range
  if (query.value.dateFrom) {
    const fromTime = new Date(query.value.dateFrom).getTime() / 1000;
    filtered = filtered.filter((item) => {
      const itemTime = item.created_at || 0;
      return itemTime >= fromTime;
    });
  }

  if (query.value.dateTo) {
    const toTime = new Date(query.value.dateTo).getTime() / 1000;
    filtered = filtered.filter((item) => {
      const itemTime = item.created_at || 0;
      return itemTime <= toTime;
    });
  }

  // Filter by balance (accounts only)
  if (query.value.entity === "Accounts") {
    if (query.value.minBalance) {
      const minBalanceCents = parseTBAmount(query.value.minBalance);
      filtered = filtered.filter(
        (item) => BigInt(item.balance || "0") >= BigInt(minBalanceCents)
      );
    }

    if (query.value.maxBalance) {
      const maxBalanceCents = parseTBAmount(query.value.maxBalance);
      filtered = filtered.filter(
        (item) => BigInt(item.balance || "0") <= BigInt(maxBalanceCents)
      );
    }
  }

  // Filter by amount (transfers only)
  if (query.value.entity === "Transfers") {
    if (query.value.minAmount) {
      const minAmountCents = parseTBAmount(query.value.minAmount);
      filtered = filtered.filter(
        (item) => BigInt(item.amount || "0") >= BigInt(minAmountCents)
      );
    }

    if (query.value.maxAmount) {
      const maxAmountCents = parseTBAmount(query.value.maxAmount);
      filtered = filtered.filter(
        (item) => BigInt(item.amount || "0") <= BigInt(maxAmountCents)
      );
    }
  }

  // Apply sorting
  filtered = applySorting(filtered);

  return filtered;
}

function applySorting(data: any[]): any[] {
  const sorted = [...data];

  switch (query.value.sortBy) {
    case "created_at_desc":
      sorted.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
      break;
    case "created_at_asc":
      sorted.sort((a, b) => (a.created_at || 0) - (b.created_at || 0));
      break;
    case "balance_desc":
      sorted.sort((a, b) =>
        Number(BigInt(b.balance || "0") - BigInt(a.balance || "0"))
      );
      break;
    case "balance_asc":
      sorted.sort((a, b) =>
        Number(BigInt(a.balance || "0") - BigInt(b.balance || "0"))
      );
      break;
    case "amount_desc":
      sorted.sort((a, b) =>
        Number(BigInt(b.amount || "0") - BigInt(a.amount || "0"))
      );
      break;
    case "amount_asc":
      sorted.sort((a, b) =>
        Number(BigInt(a.amount || "0") - BigInt(b.amount || "0"))
      );
      break;
    case "alias_asc":
      sorted.sort((a, b) => (a.alias || "").localeCompare(b.alias || ""));
      break;
  }

  return sorted;
}

function resetQuery() {
  query.value = {
    entity: "Accounts",
    ledger: null,
    code: null,
    accountId: "",
    dateFrom: "",
    dateTo: "",
    minBalance: "",
    maxBalance: "",
    minAmount: "",
    maxAmount: "",
    searchText: "",
    limit: 100,
    sortBy: "created_at_desc",
  };
  results.value = [];
  executed.value = false;
  error.value = null;
}

function saveQuery() {
  const name = prompt("Enter a name for this query:");
  if (!name) return;

  const description = prompt("Enter a description (optional):") || "";

  savedQueries.value.push({
    name,
    description,
    ...query.value,
  });

  localStorage.setItem(
    "tigerbeetle_saved_queries",
    JSON.stringify(savedQueries.value)
  );
}

function loadSavedQuery(saved: any) {
  query.value = { ...saved };
  showSavedQueries.value = false;
}

function deleteSavedQuery(index: number) {
  if (confirm("Delete this saved query?")) {
    savedQueries.value.splice(index, 1);
    localStorage.setItem(
      "tigerbeetle_saved_queries",
      JSON.stringify(savedQueries.value)
    );
  }
}

function exportResults(format: "csv" | "json") {
  if (results.value.length === 0) return;

  let content = "";
  let filename = "";
  let mimeType = "";

  if (format === "csv") {
    const headers = resultHeaders.value.map((h) => h.title).join(",");
    const rows = results.value.map((item) =>
      resultHeaders.value
        .map((h) => {
          const value = item[h.key];
          return typeof value === "string" ? `"${value}"` : value;
        })
        .join(",")
    );
    content = [headers, ...rows].join("\n");
    filename = `tigerbeetle_query_${Date.now()}.csv`;
    mimeType = "text/csv";
  } else {
    content = JSON.stringify(results.value, null, 2);
    filename = `tigerbeetle_query_${Date.now()}.json`;
    mimeType = "application/json";
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatAmount(value: string | number, ledger?: number): string {
  const strValue = typeof value === "string" ? value : value.toString();
  if (ledger !== undefined) {
    const currency = getCurrencyForLedger(ledger);
    return formatTBAmount(strValue, currency);
  }
  return formatTBAmount(strValue);
}

function formatTimestamp(timestamp: string): string {
  return formatTBTimestamp(timestamp, true);
}

function getBalanceColor(balance: string): string {
  return isPositiveTBAmount(balance) ? "success" : "error";
}

onMounted(() => {
  // Load saved queries from localStorage
  const saved = localStorage.getItem("tigerbeetle_saved_queries");
  if (saved) {
    try {
      savedQueries.value = JSON.parse(saved);
    } catch (e) {
    }
  }
});
</script>
