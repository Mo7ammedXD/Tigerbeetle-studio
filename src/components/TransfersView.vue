<template>
  <div>
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between pa-4">
        <div class="d-flex align-center">
          <v-icon icon="mdi-bank-transfer" class="mr-2" color="primary" />
          <span class="text-h5">Transfers</span>
        </div>

        <div class="d-flex gap-2">
          <v-btn
            icon="mdi-refresh"
            variant="text"
            @click="loadTransfers"
            :loading="loading"
          />
          <v-btn
            :icon="showFilters ? 'mdi-filter-off' : 'mdi-filter'"
            variant="text"
            @click="showFilters = !showFilters"
            :color="hasActiveFilters ? 'primary' : undefined"
          >
            <v-icon>{{ showFilters ? "mdi-filter-off" : "mdi-filter" }}</v-icon>
            <v-badge
              v-if="hasActiveFilters && !showFilters"
              color="primary"
              :content="activeFiltersCount"
              inline
            />
          </v-btn>
          <v-btn
            color="primary"
            prepend-icon="mdi-plus"
            @click="showCreateModal = true"
            :disabled="!isConnected"
          >
            Create Transfer
          </v-btn>
        </div>
      </v-card-title>

      <!-- Filter Panel -->
      <v-expand-transition>
        <div v-show="showFilters">
          <v-divider />
          <v-card-text class="pa-4">
            <div class="d-flex flex-wrap gap-4">
              <!-- Date Range Filter -->
              <div
                class="flex-grow-1"
                style="min-width: 250px; max-width: 400px"
              >
                <v-label class="text-caption font-weight-bold mb-2">
                  <v-icon size="small" class="mr-1">mdi-calendar-range</v-icon>
                  Date Range
                </v-label>
                <div class="d-flex gap-2">
                  <v-text-field
                    v-model="dateRange.start"
                    type="date"
                    density="compact"
                    variant="outlined"
                    hide-details
                    placeholder="Start date"
                    clearable
                  />
                  <v-text-field
                    v-model="dateRange.end"
                    type="date"
                    density="compact"
                    variant="outlined"
                    hide-details
                    placeholder="End date"
                    clearable
                  />
                </div>
              </div>

              <!-- Ledger Filter -->
              <div style="min-width: 150px">
                <v-label class="text-caption font-weight-bold mb-2">
                  <v-icon size="small" class="mr-1"
                    >mdi-book-open-variant</v-icon
                  >
                  Ledger
                </v-label>
                <v-text-field
                  v-model.number="filters.ledger"
                  type="number"
                  density="compact"
                  variant="outlined"
                  hide-details
                  placeholder="All ledgers"
                  clearable
                />
              </div>

              <!-- Code Filter -->
              <div style="min-width: 150px">
                <v-label class="text-caption font-weight-bold mb-2">
                  <v-icon size="small" class="mr-1">mdi-code-tags</v-icon>
                  Code
                </v-label>
                <v-text-field
                  v-model.number="filters.code"
                  type="number"
                  density="compact"
                  variant="outlined"
                  hide-details
                  placeholder="All codes"
                  clearable
                />
              </div>

              <!-- Action Buttons -->
              <div class="d-flex align-end gap-2">
                <v-btn
                  color="primary"
                  variant="flat"
                  @click="applyFilters"
                  prepend-icon="mdi-filter-check"
                >
                  Apply
                </v-btn>
                <v-btn
                  variant="outlined"
                  @click="clearFilters"
                  prepend-icon="mdi-filter-off"
                >
                  Clear
                </v-btn>
              </div>
            </div>

            <!-- Active Filters Chips -->
            <div v-if="hasActiveFilters" class="mt-3 d-flex flex-wrap gap-2">
              <v-chip
                v-if="dateRange.start || dateRange.end"
                size="small"
                closable
                @click:close="clearDateRange"
              >
                <v-icon start size="small">mdi-calendar</v-icon>
                {{ formatDateRangeChip() }}
              </v-chip>
              <v-chip
                v-if="filters.ledger"
                size="small"
                closable
                @click:close="
                  filters.ledger = undefined;
                  applyFilters();
                "
              >
                <v-icon start size="small">mdi-book-open-variant</v-icon>
                Ledger: {{ filters.ledger }}
              </v-chip>
              <v-chip
                v-if="filters.code"
                size="small"
                closable
                @click:close="
                  filters.code = undefined;
                  applyFilters();
                "
              >
                <v-icon start size="small">mdi-code-tags</v-icon>
                Code: {{ filters.code }}
              </v-chip>
            </div>
          </v-card-text>
        </div>
      </v-expand-transition>

      <v-divider />

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

      <v-card-text class="pa-0">
        <v-data-table
          :headers="headers"
          :items="transfers"
          :loading="loading"
          item-value="id"
          class="elevation-0"
          density="comfortable"
          v-model:expanded="expanded"
          show-expand
          :items-per-page="-1"
          hide-default-footer
        >
          <template #item.id="{ item }">
            <code class="text-caption">{{ item.id }}</code>
          </template>

          <template #item.debit_account_id="{ item }">
            <div>
              <div class="text-caption text-grey">
                {{ item.debit_alias || "Unknown" }}
              </div>
              <code class="text-caption">{{ item.debit_account_id }}</code>
            </div>
          </template>

          <template #item.credit_account_id="{ item }">
            <div>
              <div class="text-caption text-grey">
                {{ item.credit_alias || "Unknown" }}
              </div>
              <code class="text-caption">{{ item.credit_account_id }}</code>
            </div>
          </template>

          <template #item.amount="{ item }">
            <v-chip color="success" variant="flat" size="small">
              {{ formatAmount(item.amount, item.ledger) }}
            </v-chip>
          </template>

          <template #item.ledger="{ item }">
            <v-chip size="small" variant="tonal">{{ item.ledger }}</v-chip>
          </template>

          <template #item.code="{ item }">
            <v-chip size="small" variant="tonal">{{ item.code }}</v-chip>
          </template>

          <template #item.flags="{ item }">
            <v-chip
              v-if="item.flags && item.flags.length > 0"
              size="small"
              variant="tonal"
              color="info"
            >
              {{ item.flags.join(", ") }}
            </v-chip>
            <span v-else class="text-grey text-caption">None</span>
          </template>

          <template #item.created_at="{ item }">
            <span class="text-caption">{{ formatDate(item.created_at) }}</span>
          </template>

          <template #expanded-row="{ item }">
            <tr>
              <td :colspan="headers.length + 1">
                <v-card variant="tonal" class="ma-2">
                  <v-card-title class="text-subtitle-2"
                    >Transfer Details</v-card-title
                  >
                  <v-card-text>
                    <v-row dense>
                      <v-col cols="6" md="4">
                        <div class="text-caption text-grey">Transfer ID</div>
                        <code class="text-caption">{{ item.id }}</code>
                      </v-col>
                      <v-col cols="6" md="4">
                        <div class="text-caption text-grey">Pending ID</div>
                        <div class="font-mono text-caption">
                          {{ item.pending_id || "0" }}
                        </div>
                      </v-col>
                      <v-col cols="6" md="4">
                        <div class="text-caption text-grey">Timeout</div>
                        <div class="font-mono text-caption">
                          {{ item.timeout || "0" }}
                        </div>
                      </v-col>
                      <v-col cols="6" md="4">
                        <div class="text-caption text-grey">Timestamp</div>
                        <div class="font-mono text-caption">
                          {{ formatTimestamp(item.timestamp) }}
                        </div>
                      </v-col>
                      <v-col cols="6" md="4">
                        <div class="text-caption text-grey">User Data 128</div>
                        <div class="font-mono text-caption">
                          {{ item.user_data_128 || "0" }}
                        </div>
                      </v-col>
                      <v-col cols="6" md="4">
                        <div class="text-caption text-grey">User Data 64</div>
                        <div class="font-mono text-caption">
                          {{ item.user_data_64 || "0" }}
                        </div>
                      </v-col>
                      <v-col cols="6" md="4">
                        <div class="text-caption text-grey">User Data 32</div>
                        <div class="font-mono text-caption">
                          {{ item.user_data_32 || "0" }}
                        </div>
                      </v-col>
                    </v-row>
                  </v-card-text>
                </v-card>
              </td>
            </tr>
          </template>

          <template #no-data>
            <div class="text-center pa-8">
              <v-icon size="64" color="grey-lighten-1">mdi-transfer</v-icon>
              <div class="text-h6 mt-4 text-grey">No transfers yet</div>
              <div class="text-caption text-grey">
                Create your first transfer to get started
              </div>
              <v-btn
                color="primary"
                class="mt-4"
                prepend-icon="mdi-plus"
                @click="showCreateModal = true"
                :disabled="!isConnected"
              >
                Create Transfer
              </v-btn>
            </div>
          </template>
        </v-data-table>
      </v-card-text>

      <v-divider v-if="transfers.length > 0" />

      <v-card-actions
        v-if="transfers.length > 0"
        class="d-flex flex-column flex-sm-row justify-space-between align-center pa-4 gap-3"
      >
        <div class="d-flex align-center gap-2">
          <v-icon size="small" color="grey">mdi-information-outline</v-icon>
          <span class="text-body-2">
            <strong>{{ currentCount }}</strong> transfers
            <v-chip
              v-if="hasMore"
              size="x-small"
              color="primary"
              variant="flat"
              class="ml-2"
            >
              More available
            </v-chip>
          </span>
        </div>

        <div class="d-flex align-center gap-3">
          <div class="d-flex align-center gap-2">
            <v-icon size="small">mdi-table-row</v-icon>
            <v-select
              v-model="itemsPerPage"
              :items="[25, 50, 100, 200]"
              density="compact"
              variant="outlined"
              hide-details
              style="min-width: 90px"
              @update:model-value="onItemsPerPageChange"
            />
          </div>

          <v-divider vertical class="mx-2" />

          <v-btn-group variant="outlined" divided>
            <v-btn
              :disabled="!hasPrevious || cursorHistory.length === 0"
              size="small"
              @click="onPreviousPage"
            >
              <v-icon>mdi-chevron-left</v-icon>
              <span class="d-none d-sm-inline ml-1">Previous</span>
            </v-btn>

            <v-btn :disabled="!hasMore" size="small" @click="onNextPage">
              <span class="d-none d-sm-inline mr-1">Next</span>
              <v-icon>mdi-chevron-right</v-icon>
            </v-btn>
          </v-btn-group>
        </div>
      </v-card-actions>
    </v-card>

    <CreateTransferModal
      v-model="showCreateModal"
      @created="handleTransferCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { useCurrency } from "@/composables/useCurrency";
import type { TBTransfer } from "@/types/tigerbeetle";
import { formatTBAmount, formatTBTimestamp } from "@/utils/bigint";
import { computed, onActivated, onMounted, ref, watch } from "vue";
import CreateTransferModal from "./CreateTransferModal.vue";

const { getCurrencyForLedger, loadCurrency } = useCurrency();

interface Props {
  isConnected: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  refresh: [];
}>();

const transfers = ref<TBTransfer[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const showCreateModal = ref(false);
const expanded = ref<string[]>([]);
const itemsPerPage = ref(50);
const currentCursor = ref<string | null>(null);
const cursorHistory = ref<string[]>([]); // Stack for previous page cursors
const hasMore = ref(false);
const hasPrevious = ref(false);
const currentCount = ref(0);
const showFilters = ref(false);

// Date range filter (user-friendly format)
const dateRange = ref({
  start: "" as string,
  end: "" as string,
});

// Timestamp range filters (for API)
const filters = ref({
  ledger: undefined as number | undefined,
  code: undefined as number | undefined,
  timestamp_min: undefined as string | undefined,
  timestamp_max: undefined as string | undefined,
});

// Computed properties for filter UI
const hasActiveFilters = computed(() => {
  return !!(
    dateRange.value.start ||
    dateRange.value.end ||
    filters.value.ledger ||
    filters.value.code
  );
});

const activeFiltersCount = computed(() => {
  let count = 0;
  if (dateRange.value.start || dateRange.value.end) count++;
  if (filters.value.ledger) count++;
  if (filters.value.code) count++;
  return count;
});

const headers = [
  { title: "ID", key: "id", sortable: false },
  { title: "From (Debit)", key: "debit_account_id", sortable: false },
  { title: "To (Credit)", key: "credit_account_id", sortable: false },
  { title: "Amount", key: "amount", align: "end" as const },
  { title: "Ledger", key: "ledger", sortable: true },
  { title: "Code", key: "code", sortable: true },
  { title: "Flags", key: "flags", sortable: false },
  { title: "Date", key: "created_at", sortable: true },
];

async function loadTransfers(direction: "next" | "prev" = "next") {
  if (!props.isConnected) return;

  loadCurrency();
  loading.value = true;
  error.value = null;
  try {
    // Clean filters to remove undefined values (IPC can't clone undefined)
    const cleanFilters = Object.fromEntries(
      Object.entries(filters.value).filter(([_, v]) => v !== undefined)
    );

    const result = await window.tigerBeetleApi.getTransfers(
      itemsPerPage.value,
      currentCursor.value,
      direction,
      Object.keys(cleanFilters).length > 0 ? cleanFilters : undefined
    );

    if (result.success && result.data) {
      const data = result.data;
      transfers.value = data.data || [];
      hasMore.value = data.hasMore || false;
      hasPrevious.value = data.hasPrevious || false;
      currentCount.value = data.count || 0;

      // Update cursor for next page
      if (direction === "next" && data.nextCursor) {
        currentCursor.value = data.nextCursor;
      } else if (direction === "prev" && data.prevCursor) {
        currentCursor.value = data.prevCursor;
      }
    } else {
      error.value = result.error || "Failed to load transfers";
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load transfers";
    error.value = message;
  } finally {
    loading.value = false;
  }
}

function onNextPage() {
  if (!hasMore.value) return;
  if (currentCursor.value) {
    cursorHistory.value.push(currentCursor.value);
  }
  loadTransfers("next");
}

function onPreviousPage() {
  if (!hasPrevious.value || cursorHistory.value.length === 0) return;
  currentCursor.value = cursorHistory.value.pop() || null;
  loadTransfers("prev");
}

function onItemsPerPageChange(newItemsPerPage: number) {
  itemsPerPage.value = newItemsPerPage;
  currentCursor.value = null;
  cursorHistory.value = [];
  loadTransfers();
}

function applyFilters() {
  // Convert date range to timestamps
  if (dateRange.value.start) {
    const startDate = new Date(dateRange.value.start);
    filters.value.timestamp_min = (startDate.getTime() * 1000000).toString(); // Convert to nanoseconds
  } else {
    filters.value.timestamp_min = undefined;
  }

  if (dateRange.value.end) {
    const endDate = new Date(dateRange.value.end);
    endDate.setHours(23, 59, 59, 999); // End of day
    filters.value.timestamp_max = (endDate.getTime() * 1000000).toString(); // Convert to nanoseconds
  } else {
    filters.value.timestamp_max = undefined;
  }

  currentCursor.value = null;
  cursorHistory.value = [];
  loadTransfers();
}

function clearFilters() {
  dateRange.value.start = "";
  dateRange.value.end = "";
  filters.value.ledger = undefined;
  filters.value.code = undefined;
  filters.value.timestamp_min = undefined;
  filters.value.timestamp_max = undefined;
  applyFilters();
}

function clearDateRange() {
  dateRange.value.start = "";
  dateRange.value.end = "";
  applyFilters();
}

function formatDateRangeChip(): string {
  if (dateRange.value.start && dateRange.value.end) {
    return `${dateRange.value.start} to ${dateRange.value.end}`;
  } else if (dateRange.value.start) {
    return `From ${dateRange.value.start}`;
  } else if (dateRange.value.end) {
    return `Until ${dateRange.value.end}`;
  }
  return "";
}

function formatAmount(value: string | number, ledger?: number): string {
  const strValue = typeof value === "string" ? value : value.toString();
  if (ledger !== undefined) {
    const currency = getCurrencyForLedger(ledger);
    return formatTBAmount(strValue, currency);
  }
  return formatTBAmount(strValue);
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });
}

function formatTimestamp(timestamp: string): string {
  return formatTBTimestamp(timestamp, true);
}

function handleTransferCreated() {
  showCreateModal.value = false;
  loadTransfers();
  emit("refresh");
}

watch(
  () => props.isConnected,
  (newValue: boolean, oldValue: boolean) => {
    if (newValue && !oldValue) {
      loadTransfers();
    }
  }
);

onMounted(() => {
  loadTransfers();
});

onActivated(() => {
  if (props.isConnected) {
    loadTransfers();
  }
});
</script>
