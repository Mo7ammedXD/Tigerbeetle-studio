<template>
  <div>
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between pa-4">
        <div class="d-flex align-center">
          <v-icon icon="mdi-bank-transfer" class="mr-2" color="primary" />
          <span class="text-h5">Transfers</span>
          <v-chip class="ml-3" size="small" color="info">
            {{ totalItems }} total
          </v-chip>
        </div>

        <div>
          <v-btn
            icon="mdi-refresh"
            variant="text"
            @click="loadTransfers"
            :loading="loading"
            class="mr-2"
          />
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
        class="d-flex justify-space-between align-center pa-4"
      >
        <div class="text-caption text-grey">
          Showing {{ (page - 1) * itemsPerPage + 1 }} to
          {{ Math.min(page * itemsPerPage, totalItems) }} of {{ totalItems }}
          transfers
        </div>

        <div class="d-flex align-center">
          <v-select
            v-model="itemsPerPage"
            :items="[25, 50, 100, 200]"
            label="Per page"
            density="compact"
            variant="outlined"
            hide-details
            style="max-width: 120px"
            @update:model-value="onItemsPerPageChange"
          />

          <v-pagination
            v-model="page"
            :length="Math.ceil(totalItems / itemsPerPage)"
            :total-visible="5"
            size="small"
            class="ml-4"
            @update:model-value="onPageChange"
          />
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
import { onActivated, onMounted, ref, watch } from "vue";
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
const page = ref(1);
const itemsPerPage = ref(50);
const totalItems = ref(0);

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

async function loadTransfers() {
  if (!props.isConnected) return;

  loadCurrency();
  loading.value = true;
  error.value = null;
  try {
    const offset = (page.value - 1) * itemsPerPage.value;
    const result = await window.tigerBeetleApi.getTransfers(
      itemsPerPage.value,
      offset
    );

    if (result.success) {
      const data = result.data;

      if (data && typeof data === "object" && "data" in data) {
        transfers.value = data.data || [];
        totalItems.value = data.total || 0;
      } else {
        transfers.value = (data as any[]) || [];
        totalItems.value = transfers.value.length;
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

function onPageChange(newPage: number) {
  page.value = newPage;
  loadTransfers();
}

function onItemsPerPageChange(newItemsPerPage: number) {
  itemsPerPage.value = newItemsPerPage;
  page.value = 1;
  loadTransfers();
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
