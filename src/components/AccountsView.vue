<template>
  <div>
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between pa-4">
        <div class="d-flex align-center">
          <v-icon icon="mdi-account-multiple" class="mr-2" color="primary" />
          <span class="text-h5">Accounts</span>
        </div>

        <div class="d-flex gap-2">
          <v-btn
            icon="mdi-refresh"
            variant="text"
            @click="loadAccounts"
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
            Create Account
          </v-btn>
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

      <v-card-text class="pa-0">
        <v-data-table
          :headers="headers"
          :items="accounts"
          :loading="loading"
          item-value="id"
          class="elevation-0"
          density="comfortable"
          v-model:expanded="expanded"
          show-expand
          :items-per-page="-1"
          hide-default-footer
        >
          <template #item.alias="{ item }">
            <div class="d-flex align-center">
              <v-avatar color="primary" size="32" class="mr-2">
                <span class="text-caption">{{
                  item.alias.charAt(0).toUpperCase()
                }}</span>
              </v-avatar>
              <span class="font-weight-medium">{{ item.alias }}</span>
            </div>
          </template>

          <template #item.id="{ item }">
            <code class="text-caption">{{ item.id }}</code>
          </template>

          <template #item.ledger="{ item }">
            <v-chip size="small" variant="tonal">{{ item.ledger }}</v-chip>
          </template>

          <template #item.code="{ item }">
            <v-chip size="small" variant="tonal">{{ item.code }}</v-chip>
          </template>

          <template #item.debits_posted="{ item }">
            <span class="font-mono text-error">{{
              formatAmount(item.debits_posted, item.ledger)
            }}</span>
          </template>

          <template #item.credits_posted="{ item }">
            <span class="font-mono text-success">{{
              formatAmount(item.credits_posted, item.ledger)
            }}</span>
          </template>

          <template #item.balance="{ item }">
            <v-chip
              dir="auto"
              :color="getBalanceColor(item.balance)"
              variant="flat"
              size="small"
            >
              {{ formatAmount(item.balance, item.ledger) }}
            </v-chip>
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

          <template #item.actions="{ item }">
            <v-btn
              icon="mdi-information"
              size="small"
              variant="text"
              color="info"
              @click="showAccountDetails(item)"
              class="mr-1"
            />
            <v-btn
              icon="mdi-delete"
              size="small"
              variant="text"
              color="error"
              @click="deleteAccountConfirm(item)"
            />
          </template>

          <template #expanded-row="{ item }">
            <tr>
              <td :colspan="headers.length">
                <v-card variant="tonal" class="ma-2">
                  <v-card-title class="text-subtitle-2"
                    >Account Details</v-card-title
                  >
                  <v-card-text>
                    <v-row dense>
                      <v-col cols="6" md="4">
                        <div class="text-caption text-grey">Debits Pending</div>
                        <div class="font-mono">
                          {{
                            formatAmount(
                              item.debits_pending || "0",
                              item.ledger
                            )
                          }}
                        </div>
                      </v-col>
                      <v-col cols="6" md="4">
                        <div class="text-caption text-grey">
                          Credits Pending
                        </div>
                        <div class="font-mono">
                          {{
                            formatAmount(
                              item.credits_pending || "0",
                              item.ledger
                            )
                          }}
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
              <v-icon size="64" color="grey-lighten-1">mdi-account-off</v-icon>
              <div class="text-h6 mt-4 text-grey">No accounts yet</div>
              <div class="text-caption text-grey">
                Create your first account to get started
              </div>
              <v-btn
                color="primary"
                class="mt-4"
                prepend-icon="mdi-plus"
                @click="showCreateModal = true"
                :disabled="!isConnected"
              >
                Create Account
              </v-btn>
            </div>
          </template>
        </v-data-table>
      </v-card-text>

      <v-divider v-if="accounts.length > 0" />

      <v-card-actions
        v-if="accounts.length > 0"
        class="d-flex flex-column flex-sm-row justify-space-between align-center pa-4 gap-3"
      >
        <div class="d-flex align-center gap-2">
          <v-icon size="small" color="grey">mdi-information-outline</v-icon>
          <span class="text-body-2">
            <strong>{{ currentCount }}</strong> accounts
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

    <CreateAccountModal
      v-model="showCreateModal"
      @created="handleAccountCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { useCurrency } from "@/composables/useCurrency";
import type { TBAccount } from "@/types/tigerbeetle";
import {
  formatTBAmount,
  formatTBTimestamp,
  isPositiveTBAmount,
} from "@/utils/bigint";
import { computed, onActivated, onMounted, ref, watch } from "vue";
import CreateAccountModal from "./CreateAccountModal.vue";

const { getCurrencyForLedger, loadCurrency } = useCurrency();

interface Props {
  isConnected: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  refresh: [];
}>();

const accounts = ref<TBAccount[]>([]);
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

// Timestamp range filters
const filters = ref({
  ledger: undefined as number | undefined,
  code: undefined as number | undefined,
  timestamp_min: undefined as string | undefined,
  timestamp_max: undefined as string | undefined,
});

// Computed properties for filter UI
const hasActiveFilters = computed(() => {
  return !!(
    filters.value.ledger ||
    filters.value.code ||
    filters.value.timestamp_min ||
    filters.value.timestamp_max
  );
});

const activeFiltersCount = computed(() => {
  let count = 0;
  if (filters.value.ledger) count++;
  if (filters.value.code) count++;
  if (filters.value.timestamp_min || filters.value.timestamp_max) count++;
  return count;
});

const headers = [
  { title: "Alias", key: "alias", sortable: true },
  { title: "ID", key: "id", sortable: false },
  { title: "Ledger", key: "ledger", sortable: true },
  { title: "Code", key: "code", sortable: true },
  { title: "Debits", key: "debits_posted", align: "end" as const },
  { title: "Credits", key: "credits_posted", align: "end" as const },
  { title: "Balance", key: "balance", align: "end" as const },
  { title: "Flags", key: "flags", sortable: false },
  {
    title: "Actions",
    key: "actions",
    sortable: false,
    align: "center" as const,
  },
];

async function loadAccounts(direction: "next" | "prev" = "next") {
  if (!props.isConnected) return;

  loadCurrency();
  loading.value = true;
  error.value = null;
  try {
    const cleanFilters = Object.fromEntries(
      Object.entries(filters.value).filter(([_, v]) => v !== undefined)
    );

    const result = await window.tigerBeetleApi.getAccounts(
      itemsPerPage.value,
      currentCursor.value,
      direction,
      Object.keys(cleanFilters).length > 0 ? cleanFilters : undefined
    );

    if (result.success && result.data) {
      const data = result.data;
      accounts.value = data.data || [];
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
      error.value = result.error || "Failed to load accounts";
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load accounts";
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
  loadAccounts("next");
}

function onPreviousPage() {
  if (!hasPrevious.value || cursorHistory.value.length === 0) return;
  currentCursor.value = cursorHistory.value.pop() || null;
  loadAccounts("prev");
}

function onItemsPerPageChange(newItemsPerPage: number) {
  itemsPerPage.value = newItemsPerPage;
  currentCursor.value = null;
  cursorHistory.value = [];
  loadAccounts();
}

function applyFilters() {
  currentCursor.value = null;
  cursorHistory.value = [];
  loadAccounts();
}

async function deleteAccountConfirm(account: any) {
  if (
    confirm(
      `Delete account "${account.alias}" (${account.id})? This will only remove it from the local database.`
    )
  ) {
    try {
      const result = await window.tigerBeetleApi.deleteAccount(account.id);
      if (result.success) {
        await loadAccounts();
      }
    } catch (error) {}
  }
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

function showAccountDetails(account: any) {
  const index = expanded.value.indexOf(account.id);
  if (index > -1) {
    expanded.value.splice(index, 1);
  } else {
    expanded.value.push(account.id);
  }
}

function handleAccountCreated() {
  showCreateModal.value = false;
  loadAccounts();
  emit("refresh");
}

watch(
  () => props.isConnected,
  (newValue: boolean, oldValue: boolean) => {
    if (newValue && !oldValue) {
      loadAccounts();
    }
  }
);

onMounted(() => {
  loadAccounts();
});

onActivated(() => {
  if (props.isConnected) {
    loadAccounts();
  }
});
</script>
