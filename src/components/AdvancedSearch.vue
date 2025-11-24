<template>
  <div>
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between pa-4">
        <div class="d-flex align-center">
          <v-icon icon="mdi-text-search" class="mr-2" color="primary" />
          <span class="text-h5">Advanced Search</span>
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
        <!-- Search Input -->
        <v-text-field
          v-model="searchQuery"
          label="Search across all data"
          variant="outlined"
          density="comfortable"
          prepend-inner-icon="mdi-magnify"
          clearable
          @keyup.enter="executeSearch"
          hint="Search in account aliases, IDs, transfer IDs, and more"
          persistent-hint
          class="mb-4"
        >
          <template #append>
            <v-btn color="primary" @click="executeSearch" :loading="searching">
              Search
            </v-btn>
          </template>
        </v-text-field>

        <!-- Advanced Options -->
        <v-expansion-panels v-model="panels" multiple class="mb-4">
          <v-expansion-panel value="options">
            <v-expansion-panel-title>
              <v-icon icon="mdi-tune" class="mr-2" />
              Advanced Options
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-row>
                <v-col cols="12" md="6">
                  <v-checkbox
                    v-model="options.caseSensitive"
                    label="Case sensitive"
                    density="compact"
                    hide-details
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <v-checkbox
                    v-model="options.useRegex"
                    label="Use regular expressions"
                    density="compact"
                    hide-details
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <v-checkbox
                    v-model="options.searchAccounts"
                    label="Search in accounts"
                    density="compact"
                    hide-details
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <v-checkbox
                    v-model="options.searchTransfers"
                    label="Search in transfers"
                    density="compact"
                    hide-details
                  />
                </v-col>
                <v-col cols="12">
                  <v-select
                    v-model="options.searchFields"
                    :items="fieldOptions"
                    label="Search in fields"
                    variant="outlined"
                    density="compact"
                    multiple
                    chips
                    closable-chips
                  />
                </v-col>
              </v-row>
            </v-expansion-panel-text>
          </v-expansion-panel>

          <v-expansion-panel value="history">
            <v-expansion-panel-title>
              <v-icon icon="mdi-history" class="mr-2" />
              Search History
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-list v-if="searchHistory.length > 0" density="compact">
                <v-list-item
                  v-for="(item, index) in searchHistory"
                  :key="index"
                  @click="loadHistoryItem(item)"
                >
                  <v-list-item-title>{{ item.query }}</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ item.results }} results •
                    {{ formatDate(item.timestamp) }}
                  </v-list-item-subtitle>
                  <template #append>
                    <v-btn
                      icon="mdi-delete"
                      variant="text"
                      size="small"
                      @click.stop="deleteHistoryItem(index)"
                    />
                  </template>
                </v-list-item>
              </v-list>
              <v-alert v-else type="info" variant="tonal">
                No search history yet
              </v-alert>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>

        <!-- Results Tabs -->
        <v-tabs
          v-if="hasResults"
          v-model="activeTab"
          color="primary"
          class="mb-4"
        >
          <v-tab value="all"> All Results ({{ totalResults }}) </v-tab>
          <v-tab value="accounts" v-if="accountResults.length > 0">
            Accounts ({{ accountResults.length }})
          </v-tab>
          <v-tab value="transfers" v-if="transferResults.length > 0">
            Transfers ({{ transferResults.length }})
          </v-tab>
        </v-tabs>

        <!-- Results Content -->
        <v-window v-if="hasResults" v-model="activeTab">
          <!-- All Results -->
          <v-window-item value="all">
            <div class="mb-4">
              <v-chip color="success" class="mr-2">
                {{ accountResults.length }} accounts
              </v-chip>
              <v-chip color="info">
                {{ transferResults.length }} transfers
              </v-chip>
            </div>

            <!-- Account Results -->
            <div v-if="accountResults.length > 0" class="mb-4">
              <div class="text-subtitle-1 mb-2">Accounts</div>
              <v-list>
                <v-list-item
                  v-for="account in accountResults.slice(0, 5)"
                  :key="account.id"
                >
                  <template #prepend>
                    <v-icon icon="mdi-account" color="success" />
                  </template>
                  <v-list-item-title>{{ account.alias }}</v-list-item-title>
                  <v-list-item-subtitle>
                    ID: {{ account.id }} | Balance:
                    {{ formatAmount(account.balance, account.ledger) }}
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
              <v-btn
                v-if="accountResults.length > 5"
                variant="text"
                @click="activeTab = 'accounts'"
              >
                View all {{ accountResults.length }} accounts
              </v-btn>
            </div>

            <!-- Transfer Results -->
            <div v-if="transferResults.length > 0">
              <div class="text-subtitle-1 mb-2">Transfers</div>
              <v-list>
                <v-list-item
                  v-for="transfer in transferResults.slice(0, 5)"
                  :key="transfer.id"
                >
                  <template #prepend>
                    <v-icon icon="mdi-bank-transfer" color="info" />
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
                    {{ formatAmount(transfer.amount, transfer.ledger) }} |
                    {{ formatTimestamp(transfer.timestamp) }}
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
              <v-btn
                v-if="transferResults.length > 5"
                variant="text"
                @click="activeTab = 'transfers'"
              >
                View all {{ transferResults.length }} transfers
              </v-btn>
            </div>
          </v-window-item>

          <!-- Accounts Tab -->
          <v-window-item value="accounts">
            <v-data-table
              :headers="accountHeaders"
              :items="accountResults"
              :items-per-page="25"
              density="comfortable"
            >
              <template #item.balance="{ item }">
                <v-chip :color="getBalanceColor(item.balance)" size="small">
                  {{ formatAmount(item.balance, item.ledger) }}
                </v-chip>
              </template>
              <template #item.flags="{ item }">
                <v-chip
                  v-for="flag in item.flags"
                  :key="flag"
                  size="x-small"
                  class="mr-1"
                >
                  {{ flag }}
                </v-chip>
              </template>
            </v-data-table>
          </v-window-item>

          <!-- Transfers Tab -->
          <v-window-item value="transfers">
            <v-data-table
              :headers="transferHeaders"
              :items="transferResults"
              :items-per-page="25"
              density="comfortable"
            >
              <template #item.amount="{ item }">
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
                >
                  {{ flag }}
                </v-chip>
              </template>
            </v-data-table>
          </v-window-item>
        </v-window>

        <!-- No Results -->
        <v-alert v-else-if="searched && !searching" type="info" variant="tonal">
          No results found for "{{ searchQuery }}"
        </v-alert>

        <!-- Quick Search Tips -->
        <v-card v-if="!searched" variant="outlined" class="mt-4">
          <v-card-title>Search Tips</v-card-title>
          <v-card-text>
            <ul class="text-body-2">
              <li>Search by account alias, ID, or balance</li>
              <li>Search by transfer ID, amount, or account IDs</li>
              <li>Use regex for advanced pattern matching</li>
              <li>Filter by specific fields for faster results</li>
              <li>Recent searches are saved for quick access</li>
            </ul>
          </v-card-text>
        </v-card>
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
import { computed, onMounted, ref } from "vue";

const { getCurrencyForLedger, loadCurrency } = useCurrency();

interface Props {
  isConnected: boolean;
}

const props = defineProps<Props>();

const searchQuery = ref("");
const searching = ref(false);
const searched = ref(false);
const error = ref<string | null>(null);
const activeTab = ref("all");
const panels = ref(["options"]);

const accountResults = ref<TBAccount[]>([]);
const transferResults = ref<TBTransfer[]>([]);
const searchHistory = ref<any[]>([]);

const options = ref({
  caseSensitive: false,
  useRegex: false,
  searchAccounts: true,
  searchTransfers: true,
  searchFields: ["alias", "id", "amount", "balance"],
});

const fieldOptions = [
  { title: "Alias", value: "alias" },
  { title: "ID", value: "id" },
  { title: "Amount", value: "amount" },
  { title: "Balance", value: "balance" },
  { title: "Ledger", value: "ledger" },
  { title: "Code", value: "code" },
];

const accountHeaders = [
  { title: "Alias", key: "alias" },
  { title: "ID", key: "id" },
  { title: "Ledger", key: "ledger" },
  { title: "Code", key: "code" },
  { title: "Balance", key: "balance", align: "end" as const },
  { title: "Flags", key: "flags" },
];

const transferHeaders = [
  { title: "ID", key: "id" },
  { title: "From", key: "debit_alias" },
  { title: "To", key: "credit_alias" },
  { title: "Amount", key: "amount", align: "end" as const },
  { title: "Timestamp", key: "timestamp" },
  { title: "Flags", key: "flags" },
];

const hasResults = computed(
  () => accountResults.value.length > 0 || transferResults.value.length > 0
);
const totalResults = computed(
  () => accountResults.value.length + transferResults.value.length
);

async function executeSearch() {
  if (!searchQuery.value.trim() || !props.isConnected) return;

  loadCurrency();
  searching.value = true;
  searched.value = true;
  error.value = null;
  accountResults.value = [];
  transferResults.value = [];

  try {
    // Fetch all data
    const [accountsResult, transfersResult] = await Promise.all([
      options.value.searchAccounts
        ? window.tigerBeetleApi.getAccounts(10000, 0)
        : Promise.resolve({ success: true, data: [] }),
      options.value.searchTransfers
        ? window.tigerBeetleApi.getTransfers(10000, 0)
        : Promise.resolve({ success: true, data: [] }),
    ]);

    // Process accounts
    if (accountsResult.success && options.value.searchAccounts) {
      const data = accountsResult.data;
      const accounts =
        data && "data" in data ? data.data : (data as any[]) || [];
      accountResults.value = searchInAccounts(accounts);
    }

    // Process transfers
    if (transfersResult.success && options.value.searchTransfers) {
      const data = transfersResult.data;
      const transfers =
        data && "data" in data ? data.data : (data as any[]) || [];
      transferResults.value = searchInTransfers(transfers);
    }

    // Add to history
    addToHistory({
      query: searchQuery.value,
      results: totalResults.value,
      timestamp: Date.now(),
    });
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Search failed";
  } finally {
    searching.value = false;
  }
}

function searchInAccounts(accounts: any[]): TBAccount[] {
  const query = options.value.caseSensitive
    ? searchQuery.value
    : searchQuery.value.toLowerCase();

  return accounts.filter((account: any) => {
    if (options.value.useRegex) {
      try {
        const regex = new RegExp(query, options.value.caseSensitive ? "" : "i");
        return options.value.searchFields.some((field) => {
          const value = String(account[field] || "");
          return regex.test(value);
        });
      } catch (e) {
        return false;
      }
    } else {
      return options.value.searchFields.some((field) => {
        const value = options.value.caseSensitive
          ? String(account[field] || "")
          : String(account[field] || "").toLowerCase();
        return value.includes(query);
      });
    }
  });
}

function searchInTransfers(transfers: any[]): TBTransfer[] {
  const query = options.value.caseSensitive
    ? searchQuery.value
    : searchQuery.value.toLowerCase();

  return transfers.filter((transfer: any) => {
    if (options.value.useRegex) {
      try {
        const regex = new RegExp(query, options.value.caseSensitive ? "" : "i");
        return (
          options.value.searchFields.some((field) => {
            const value = String(transfer[field] || "");
            return regex.test(value);
          }) ||
          regex.test(transfer.debit_alias || "") ||
          regex.test(transfer.credit_alias || "") ||
          regex.test(transfer.debit_account_id || "") ||
          regex.test(transfer.credit_account_id || "")
        );
      } catch (e) {
        return false;
      }
    } else {
      const searchFields = [
        transfer.id,
        transfer.debit_alias,
        transfer.credit_alias,
        transfer.debit_account_id,
        transfer.credit_account_id,
        transfer.amount,
      ];

      return searchFields.some((field) => {
        const value = options.value.caseSensitive
          ? String(field || "")
          : String(field || "").toLowerCase();
        return value.includes(query);
      });
    }
  });
}

function addToHistory(item: any) {
  searchHistory.value.unshift(item);
  if (searchHistory.value.length > 10) {
    searchHistory.value = searchHistory.value.slice(0, 10);
  }
  localStorage.setItem(
    "tigerbeetle_search_history",
    JSON.stringify(searchHistory.value)
  );
}

function loadHistoryItem(item: any) {
  searchQuery.value = item.query;
  executeSearch();
}

function deleteHistoryItem(index: number) {
  searchHistory.value.splice(index, 1);
  localStorage.setItem(
    "tigerbeetle_search_history",
    JSON.stringify(searchHistory.value)
  );
}

function formatAmount(value: string, ledger?: number): string {
  if (ledger !== undefined) {
    const currency = getCurrencyForLedger(ledger);
    return formatTBAmount(value, currency);
  }
  return formatTBAmount(value);
}

function formatTimestamp(timestamp: string): string {
  return formatTBTimestamp(timestamp, true);
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

function getBalanceColor(balance: string): string {
  return isPositiveTBAmount(balance) ? "success" : "error";
}

onMounted(() => {
  const saved = localStorage.getItem("tigerbeetle_search_history");
  if (saved) {
    try {
      searchHistory.value = JSON.parse(saved);
    } catch (e) {
    }
  }
});
</script>
