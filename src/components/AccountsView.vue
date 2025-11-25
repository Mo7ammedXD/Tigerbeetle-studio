<template>
  <div>
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between pa-4">
        <div class="d-flex align-center">
          <v-icon icon="mdi-account-multiple" class="mr-2" color="primary" />
          <span class="text-h5">Accounts</span>
          <v-chip class="ml-3" size="small" color="info">
            {{ totalItems }} total
          </v-chip>
        </div>

        <div>
          <v-btn
            icon="mdi-refresh"
            variant="text"
            @click="loadAccounts"
            :loading="loading"
            class="mr-2"
          />
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

        <v-card-actions
          v-if="totalItems > itemsPerPage"
          class="justify-center pa-4"
        >
          <v-pagination
            v-model="page"
            :length="Math.ceil(totalItems / itemsPerPage)"
            :total-visible="7"
            @update:model-value="onPageChange"
          />
          <v-select
            v-model="itemsPerPage"
            :items="[25, 50, 100, 200]"
            label="Items per page"
            density="compact"
            variant="outlined"
            class="ml-4"
            style="max-width: 150px"
            @update:model-value="onItemsPerPageChange"
          />
        </v-card-actions>
      </v-card-text>
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
import { onActivated, onMounted, ref, watch } from "vue";
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
const page = ref(1);
const itemsPerPage = ref(50);
const totalItems = ref(0);

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

async function loadAccounts() {
  if (!props.isConnected) return;

  loadCurrency();
  loading.value = true;
  error.value = null;
  try {
    const offset = (page.value - 1) * itemsPerPage.value;
    const result = await window.tigerBeetleApi.getAccounts(
      itemsPerPage.value,
      offset
    );

    if (result.success) {
      const data = result.data;
      
      if (data && typeof data === "object" && "data" in data) {
        accounts.value = data.data || [];
        totalItems.value = data.total || 0;
      } else {
        accounts.value = (data as any[]) || [];
        totalItems.value = accounts.value.length;
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

function onPageChange(newPage: number) {
  page.value = newPage;
  loadAccounts();
}

function onItemsPerPageChange(newItemsPerPage: number) {
  itemsPerPage.value = newItemsPerPage;
  page.value = 1;
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
    } catch (error) {
    }
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
