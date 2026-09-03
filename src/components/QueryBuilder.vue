<template>
  <div>
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between pa-4">
        <div class="d-flex align-center">
          <v-icon icon="mdi-database-search" class="mr-2" color="primary" />
          <span class="text-h5">Query</span>
        </div>
        <v-btn
          variant="text"
          size="small"
          prepend-icon="mdi-label-outline"
          @click="labelDialog = true"
        >
          Name fields
        </v-btn>
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-4">
        <v-alert
          type="info"
          variant="tonal"
          density="compact"
          class="mb-4 text-caption"
        >
          Runs server-side against TigerBeetle's query API — only matching rows
          are returned. Empty fields are ignored.
        </v-alert>

        <v-btn-toggle
          v-model="entity"
          mandatory
          density="compact"
          variant="outlined"
          class="mb-4"
        >
          <v-btn value="accounts" prepend-icon="mdi-account-multiple">
            Accounts
          </v-btn>
          <v-btn value="transfers" prepend-icon="mdi-bank-transfer">
            Transfers
          </v-btn>
        </v-btn-toggle>

        <v-row dense>
          <v-col cols="12" sm="6" md="3">
            <v-text-field
              v-model.number="filters.ledger"
              label="Ledger"
              type="number"
              variant="outlined"
              density="compact"
              clearable
              hide-details
              placeholder="Any"
            />
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-text-field
              v-model.number="filters.code"
              label="Code"
              type="number"
              variant="outlined"
              density="compact"
              clearable
              hide-details
              placeholder="Any"
            />
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-text-field
              v-model="dateRange.start"
              label="From"
              type="date"
              variant="outlined"
              density="compact"
              clearable
              hide-details
            />
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-text-field
              v-model="dateRange.end"
              label="To"
              type="date"
              variant="outlined"
              density="compact"
              clearable
              hide-details
            />
          </v-col>

          <v-col cols="12" md="4">
            <v-text-field
              v-model="filters.user_data_128"
              :label="labels.user_data_128"
              variant="outlined"
              density="compact"
              clearable
              hide-details
              placeholder="Any"
              :rules="[]"
            />
          </v-col>
          <v-col cols="12" sm="6" md="4">
            <v-text-field
              v-model="filters.user_data_64"
              :label="labels.user_data_64"
              variant="outlined"
              density="compact"
              clearable
              hide-details
              placeholder="Any"
            />
          </v-col>
          <v-col cols="12" sm="6" md="4">
            <v-text-field
              v-model.number="filters.user_data_32"
              :label="labels.user_data_32"
              type="number"
              variant="outlined"
              density="compact"
              clearable
              hide-details
              placeholder="Any"
            />
          </v-col>

          <v-col cols="12" sm="6" md="3">
            <v-text-field
              v-model.number="filters.limit"
              label="Limit"
              type="number"
              variant="outlined"
              density="compact"
              hide-details
              :hint="`Max ${MAX_BATCH}`"
            />
          </v-col>
          <v-col cols="12" sm="6" md="3" class="d-flex align-center">
            <v-switch
              v-model="filters.reversed"
              label="Newest first"
              density="compact"
              hide-details
              color="primary"
            />
          </v-col>
          <v-col cols="12" md="6" class="d-flex align-center justify-end gap-2">
            <v-btn variant="outlined" @click="reset">Reset</v-btn>
            <v-btn
              color="primary"
              variant="flat"
              prepend-icon="mdi-magnify"
              :loading="loading"
              :disabled="!isConnected"
              @click="run"
            >
              Run query
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>

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

      <v-card-text class="pa-0">
        <div
          v-if="hasRun"
          class="pa-3 d-flex align-center justify-space-between"
        >
          <span class="text-body-2">
            {{ results.length }} result{{ results.length === 1 ? "" : "s" }}
            <span v-if="results.length >= (filters.limit || 0)">
              (limit reached — narrow the filters or raise the limit)
            </span>
          </span>
          <v-btn
            size="small"
            variant="text"
            prepend-icon="mdi-download"
            :disabled="results.length === 0"
            @click="exportJson"
          >
            Export JSON
          </v-btn>
        </div>

        <v-data-table
          v-if="hasRun"
          :headers="headers"
          :items="results"
          :loading="loading"
          density="comfortable"
          :items-per-page="50"
        >
          <template #item.id="{ item }">
            <span class="font-mono text-caption">{{ item.id }}</span>
          </template>
          <template #item.amount="{ item }">
            {{ formatAmount(item.amount, item.ledger) }}
          </template>
          <template #item.balance="{ item }">
            {{ formatAmount(item.balance, item.ledger) }}
          </template>
          <template #item.timestamp="{ item }">
            <span class="text-caption">
              {{ formatTBTimestamp(item.timestamp, true) }}
            </span>
          </template>
          <template #no-data>
            <div class="pa-8 text-center text-medium-emphasis">
              No rows matched this query.
            </div>
          </template>
        </v-data-table>

        <div v-else class="pa-8 text-center text-medium-emphasis">
          Set your filters and run the query.
        </div>
      </v-card-text>
    </v-card>

    <!-- Field naming -->
    <v-dialog v-model="labelDialog" max-width="520">
      <v-card>
        <v-card-title class="pa-4">Name the user data fields</v-card-title>
        <v-card-text>
          <p class="text-body-2 text-medium-emphasis mb-4">
            TigerBeetle's user data fields are your link to an external system.
            Naming them here makes queries and tables readable. Stored locally.
          </p>
          <v-text-field
            v-for="field in labelFields"
            :key="field"
            :model-value="labels[field]"
            :label="field"
            variant="outlined"
            density="compact"
            class="mb-2"
            @update:model-value="(v: string) => setLabel(field, v)"
          />
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-btn variant="text" @click="resetLabels">Reset to defaults</v-btn>
          <v-spacer />
          <v-btn color="primary" variant="flat" @click="labelDialog = false">
            Done
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { useCurrency } from "@/composables/useCurrency";
import { useFieldLabels, type FieldLabels } from "@/composables/useFieldLabels";
import { formatTBAmount, formatTBTimestamp } from "@/utils/bigint";
import type { QueryAccountsFilter, QueryTransfersFilter } from "@/types/window";
import { computed, ref } from "vue";

interface Props {
  isConnected: boolean;
}

const props = defineProps<Props>();

const { getCurrencyForLedger } = useCurrency();
const { labels, setLabel, resetLabels } = useFieldLabels();

const MAX_BATCH = 8189;
const labelFields: (keyof FieldLabels)[] = [
  "user_data_128",
  "user_data_64",
  "user_data_32",
];

const entity = ref<"accounts" | "transfers">("accounts");
const loading = ref(false);
const hasRun = ref(false);
const error = ref<string | null>(null);
const results = ref<any[]>([]);
const labelDialog = ref(false);

const dateRange = ref({ start: "", end: "" });
const filters = ref({
  ledger: undefined as number | undefined,
  code: undefined as number | undefined,
  user_data_128: "",
  user_data_64: "",
  user_data_32: undefined as number | undefined,
  limit: 100,
  reversed: true,
});

const headers = computed(() =>
  entity.value === "accounts"
    ? [
        { title: "Alias", key: "alias" },
        { title: "ID", key: "id", sortable: false },
        { title: "Ledger", key: "ledger" },
        { title: "Code", key: "code" },
        { title: "Balance", key: "balance", align: "end" as const },
        { title: labels.value.user_data_128, key: "user_data_128" },
        { title: "Timestamp", key: "timestamp" },
      ]
    : [
        { title: "ID", key: "id", sortable: false },
        { title: "Debit", key: "debit_account_id", sortable: false },
        { title: "Credit", key: "credit_account_id", sortable: false },
        { title: "Amount", key: "amount", align: "end" as const },
        { title: "Ledger", key: "ledger" },
        { title: "Code", key: "code" },
        { title: labels.value.user_data_128, key: "user_data_128" },
        { title: "Timestamp", key: "timestamp" },
      ]
);

function formatAmount(value: string, ledger?: number): string {
  if (value === undefined || value === null) return "";
  return ledger !== undefined
    ? formatTBAmount(value, getCurrencyForLedger(ledger))
    : formatTBAmount(value);
}

function buildFilter(): QueryAccountsFilter & QueryTransfersFilter {
  const filter: QueryAccountsFilter & QueryTransfersFilter = {
    limit: Math.min(filters.value.limit || 100, MAX_BATCH),
    reversed: filters.value.reversed,
  };

  if (filters.value.ledger) filter.ledger = filters.value.ledger;
  if (filters.value.code) filter.code = filters.value.code;
  if (dateRange.value.start) {
    filter.timestamp_min = (
      new Date(dateRange.value.start).getTime() * 1_000_000
    ).toString();
  }
  if (dateRange.value.end) {
    const end = new Date(dateRange.value.end);
    end.setHours(23, 59, 59, 999);
    filter.timestamp_max = (end.getTime() * 1_000_000).toString();
  }

  return filter;
}

async function run() {
  if (!props.isConnected) return;

  loading.value = true;
  error.value = null;

  try {
    const filter: any = buildFilter();
    if (filters.value.user_data_128)
      filter.user_data_128 = filters.value.user_data_128;
    if (filters.value.user_data_64)
      filter.user_data_64 = filters.value.user_data_64;
    if (filters.value.user_data_32)
      filter.user_data_32 = filters.value.user_data_32;

    const result =
      entity.value === "accounts"
        ? await window.tigerBeetleApi.queryAccounts(filter)
        : await window.tigerBeetleApi.queryTransfers(filter);

    if (result.success) {
      results.value = result.data || [];
      hasRun.value = true;
    } else {
      error.value = result.error || "Query failed";
    }
  } catch (err: any) {
    error.value = err?.message || "Query failed";
  } finally {
    loading.value = false;
  }
}

function reset() {
  filters.value = {
    ledger: undefined,
    code: undefined,
    user_data_128: "",
    user_data_64: "",
    user_data_32: undefined,
    limit: 100,
    reversed: true,
  };
  dateRange.value = { start: "", end: "" };
  results.value = [];
  hasRun.value = false;
  error.value = null;
}

function exportJson() {
  const blob = new Blob([JSON.stringify(results.value, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${entity.value}-query-${Date.now()}.json`;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
</script>
