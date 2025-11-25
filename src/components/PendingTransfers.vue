<template>
  <div>
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between pa-4">
        <div class="d-flex align-center">
          <v-icon icon="mdi-clock-alert" class="mr-2" color="warning" />
          <span class="text-h5">Pending Transfers</span>
          <v-chip class="ml-3" size="small" color="warning">
            {{ pendingTransfers.length }} pending
          </v-chip>
        </div>
        <v-btn
          icon="mdi-refresh"
          variant="text"
          @click="loadPendingTransfers"
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

      <v-alert
        v-if="success"
        type="success"
        variant="tonal"
        class="ma-4"
        closable
        @click:close="success = null"
      >
        {{ success }}
      </v-alert>

      <v-card-text>
        
        <v-alert type="info" variant="tonal" class="mb-4">
          <div class="text-subtitle-2 mb-2">About Pending Transfers</div>
          <div class="text-body-2">
            Pending transfers are two-phase commits. They reserve funds but
            don't complete until posted. You can either
            <strong>post</strong> (commit) or <strong>void</strong> (rollback)
            pending transfers.
          </div>
        </v-alert>

        
        <v-row class="mb-4">
          <v-col cols="12" md="4">
            <v-select
              v-model="filter.status"
              :items="statusOptions"
              label="Status"
              variant="outlined"
              density="compact"
              clearable
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-select
              v-model="filter.timeoutStatus"
              :items="timeoutOptions"
              label="Timeout Status"
              variant="outlined"
              density="compact"
              clearable
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="filter.searchText"
              label="Search"
              variant="outlined"
              density="compact"
              clearable
              prepend-inner-icon="mdi-magnify"
            />
          </v-col>
        </v-row>

        
        <v-data-table
          v-if="filteredTransfers.length > 0"
          :headers="headers"
          :items="filteredTransfers"
          :items-per-page="25"
          density="comfortable"
          class="elevation-1"
        >
          <template #item.status="{ item }">
            <v-chip :color="getStatusColor(item)" size="small">
              {{ item.isPending ? "PENDING" : "POSTED" }}
            </v-chip>
          </template>

          <template #item.amount="{ item }">
            <span class="font-mono">{{
              formatAmount(item.amount, item.ledger)
            }}</span>
          </template>

          <template #item.timeout="{ item }">
            <v-chip :color="getTimeoutColor(item)" size="small">
              {{ formatTimeout(item.timeout, item.timestamp) }}
            </v-chip>
          </template>

          <template #item.timestamp="{ item }">
            {{ formatTimestamp(item.timestamp) }}
          </template>

          <template #item.actions="{ item }">
            <div v-if="item.isPending" class="d-flex gap-2">
              <v-btn
                color="success"
                size="small"
                prepend-icon="mdi-check"
                @click="postTransfer(item)"
                :loading="processing[item.id]"
              >
                Post
              </v-btn>
              <v-btn
                color="error"
                size="small"
                prepend-icon="mdi-close"
                @click="voidTransfer(item)"
                :loading="processing[item.id]"
              >
                Void
              </v-btn>
            </div>
            <v-chip v-else size="small" color="grey"> Completed </v-chip>
          </template>

          <template #expanded-row="{ item }">
            <tr>
              <td :colspan="headers.length">
                <v-card flat class="ma-2">
                  <v-card-text>
                    <v-row>
                      <v-col cols="12" md="6">
                        <div class="text-caption text-grey mb-1">
                          Transfer ID
                        </div>
                        <div class="text-body-2 mb-3">{{ item.id }}</div>

                        <div class="text-caption text-grey mb-1">
                          Pending ID
                        </div>
                        <div class="text-body-2 mb-3">
                          {{ item.pending_id || "N/A" }}
                        </div>

                        <div class="text-caption text-grey mb-1">
                          Debit Account
                        </div>
                        <div class="text-body-2 mb-3">
                          {{ item.debit_alias || item.debit_account_id }}
                        </div>

                        <div class="text-caption text-grey mb-1">
                          Credit Account
                        </div>
                        <div class="text-body-2 mb-3">
                          {{ item.credit_alias || item.credit_account_id }}
                        </div>
                      </v-col>

                      <v-col cols="12" md="6">
                        <div class="text-caption text-grey mb-1">Ledger</div>
                        <div class="text-body-2 mb-3">{{ item.ledger }}</div>

                        <div class="text-caption text-grey mb-1">Code</div>
                        <div class="text-body-2 mb-3">{{ item.code }}</div>

                        <div class="text-caption text-grey mb-1">Flags</div>
                        <div class="mb-3">
                          <v-chip
                            v-for="flag in item.flags"
                            :key="flag"
                            size="x-small"
                            class="mr-1"
                          >
                            {{ flag }}
                          </v-chip>
                        </div>

                        <div class="text-caption text-grey mb-1">Created</div>
                        <div class="text-body-2">
                          {{ formatDate(item.created_at) }}
                        </div>
                      </v-col>
                    </v-row>
                  </v-card-text>
                </v-card>
              </td>
            </tr>
          </template>
        </v-data-table>

        <v-alert v-else-if="!loading" type="info" variant="tonal">
          No pending transfers found.
        </v-alert>

        
        <v-card
          v-if="pendingTransfers.length > 0"
          variant="outlined"
          class="mt-4"
        >
          <v-card-title>Bulk Actions</v-card-title>
          <v-card-text>
            <v-alert type="warning" variant="tonal" class="mb-4">
              <strong>Warning:</strong> Bulk actions will affect all pending
              transfers matching the current filters.
            </v-alert>
            <div class="d-flex gap-2">
              <v-btn
                color="success"
                prepend-icon="mdi-check-all"
                @click="bulkPost"
                :loading="bulkProcessing"
                :disabled="
                  filteredTransfers.filter((t) => t.isPending).length === 0
                "
              >
                Post All ({{
                  filteredTransfers.filter((t) => t.isPending).length
                }})
              </v-btn>
              <v-btn
                color="error"
                prepend-icon="mdi-close-box-multiple"
                @click="bulkVoid"
                :loading="bulkProcessing"
                :disabled="
                  filteredTransfers.filter((t) => t.isPending).length === 0
                "
              >
                Void All ({{
                  filteredTransfers.filter((t) => t.isPending).length
                }})
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { useCurrency } from "@/composables/useCurrency";
import type { TBTransfer } from "@/types/tigerbeetle";
import { formatTBAmount, formatTBTimestamp } from "@/utils/bigint";
import { computed, onMounted, ref, watch } from "vue";

const { getCurrencyForLedger, loadCurrency } = useCurrency();

interface Props {
  isConnected: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{ refresh: [] }>();

const loading = ref(false);
const error = ref<string | null>(null);
const success = ref<string | null>(null);
const pendingTransfers = ref<TBTransfer[]>([]);
const processing = ref<Record<string, boolean>>({});
const bulkProcessing = ref(false);

const filter = ref({
  status: null as string | null,
  timeoutStatus: null as string | null,
  searchText: "",
});

const statusOptions = [
  { title: "Pending", value: "pending" },
  { title: "Posted", value: "posted" },
];

const timeoutOptions = [
  { title: "Expiring Soon (< 1h)", value: "expiring" },
  { title: "Expired", value: "expired" },
  { title: "Active", value: "active" },
];

const headers = [
  { title: "Status", key: "status", sortable: true },
  { title: "ID", key: "id", sortable: false },
  { title: "From", key: "debit_alias", sortable: false },
  { title: "To", key: "credit_alias", sortable: false },
  { title: "Amount", key: "amount", align: "end" as const },
  { title: "Timeout", key: "timeout", sortable: true },
  { title: "Created", key: "timestamp", sortable: true },
  {
    title: "Actions",
    key: "actions",
    sortable: false,
    align: "center" as const,
  },
];

const filteredTransfers = computed(() => {
  let filtered = [...pendingTransfers.value];

  
  if (filter.value.status === "pending") {
    filtered = filtered.filter((t) => t.flags?.includes("pending"));
  } else if (filter.value.status === "posted") {
    filtered = filtered.filter((t) => !t.flags?.includes("pending"));
  }

  
  if (filter.value.timeoutStatus) {
    const now = Date.now() / 1000;
    filtered = filtered.filter((t) => {
      const createdAt = t.created_at || 0;
      const timeout = t.timeout || 0;
      const expiresAt = createdAt + timeout;
      const timeLeft = expiresAt - now;

      if (filter.value.timeoutStatus === "expiring") {
        return timeLeft > 0 && timeLeft < 3600; 
      } else if (filter.value.timeoutStatus === "expired") {
        return timeLeft <= 0;
      } else if (filter.value.timeoutStatus === "active") {
        return timeLeft > 3600;
      }
      return true;
    });
  }

  
  if (filter.value.searchText) {
    const search = filter.value.searchText.toLowerCase();
    filtered = filtered.filter(
      (t) =>
        t.id.toLowerCase().includes(search) ||
        t.debit_alias?.toLowerCase().includes(search) ||
        t.credit_alias?.toLowerCase().includes(search)
    );
  }

  return filtered;
});

watch(
  () => props.isConnected,
  (connected) => {
    if (connected) {
      loadPendingTransfers();
    }
  }
);

onMounted(() => {
  if (props.isConnected) {
    loadPendingTransfers();
  }
});

async function loadPendingTransfers() {
  if (!props.isConnected) return;

  loadCurrency();
  loading.value = true;
  error.value = null;

  try {
    const result = await window.tigerBeetleApi.getTransfers(1000, 0);
    if (result.success) {
      const data = result.data;
      const transfers =
        data && "data" in data ? data.data : (data as any[]) || [];

      
      pendingTransfers.value = transfers.map((t: any) => ({
        ...t,
        isPending: t.flags?.includes("pending") || false,
      }));
    } else {
      error.value = result.error || "Failed to load transfers";
    }
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "Failed to load pending transfers";
  } finally {
    loading.value = false;
  }
}

async function postTransfer(transfer: any) {
  if (
    !confirm(
      `Post pending transfer for ${formatAmount(
        transfer.amount,
        transfer.ledger
      )}?`
    )
  )
    return;

  processing.value[transfer.id] = true;
  error.value = null;

  try {
    
    const result = await window.tigerBeetleApi.createTransfer({
      pending_id: transfer.id,
      debit_account_id: transfer.debit_account_id,
      credit_account_id: transfer.credit_account_id,
      amount: transfer.amount,
      ledger: transfer.ledger,
      code: transfer.code,
      flags: 4, 
    });

    if (result.success) {
      success.value = "Transfer posted successfully";
      await loadPendingTransfers();
      emit("refresh");
    } else {
      error.value = result.error || "Failed to post transfer";
    }
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "Failed to post transfer";
  } finally {
    processing.value[transfer.id] = false;
  }
}

async function voidTransfer(transfer: any) {
  if (
    !confirm(
      `Void pending transfer for ${formatAmount(
        transfer.amount,
        transfer.ledger
      )}? This cannot be undone.`
    )
  )
    return;

  processing.value[transfer.id] = true;
  error.value = null;

  try {
    
    const result = await window.tigerBeetleApi.createTransfer({
      pending_id: transfer.id,
      debit_account_id: transfer.debit_account_id,
      credit_account_id: transfer.credit_account_id,
      amount: "0", 
      ledger: transfer.ledger,
      code: transfer.code,
      flags: 8, 
    });

    if (result.success) {
      success.value = "Transfer voided successfully";
      await loadPendingTransfers();
      emit("refresh");
    } else {
      error.value = result.error || "Failed to void transfer";
    }
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "Failed to void transfer";
  } finally {
    processing.value[transfer.id] = false;
  }
}

async function bulkPost() {
  const pending = filteredTransfers.value.filter((t) => t.isPending);
  if (!confirm(`Post ${pending.length} pending transfers?`)) return;

  bulkProcessing.value = true;
  let successCount = 0;
  let errorCount = 0;

  for (const transfer of pending) {
    try {
      const result = await window.tigerBeetleApi.createTransfer({
        pending_id: transfer.id,
        debit_account_id: transfer.debit_account_id,
        credit_account_id: transfer.credit_account_id,
        amount: transfer.amount,
        ledger: transfer.ledger,
        code: transfer.code,
        flags: 4,
      });

      if (result.success) {
        successCount++;
      } else {
        errorCount++;
      }
    } catch (err) {
      errorCount++;
    }
  }

  bulkProcessing.value = false;
  success.value = `Bulk post completed: ${successCount} succeeded, ${errorCount} failed`;
  await loadPendingTransfers();
  emit("refresh");
}

async function bulkVoid() {
  const pending = filteredTransfers.value.filter((t) => t.isPending);
  if (
    !confirm(`Void ${pending.length} pending transfers? This cannot be undone.`)
  )
    return;

  bulkProcessing.value = true;
  let successCount = 0;
  let errorCount = 0;

  for (const transfer of pending) {
    try {
      const result = await window.tigerBeetleApi.createTransfer({
        pending_id: transfer.id,
        debit_account_id: transfer.debit_account_id,
        credit_account_id: transfer.credit_account_id,
        amount: "0",
        ledger: transfer.ledger,
        code: transfer.code,
        flags: 8,
      });

      if (result.success) {
        successCount++;
      } else {
        errorCount++;
      }
    } catch (err) {
      errorCount++;
    }
  }

  bulkProcessing.value = false;
  success.value = `Bulk void completed: ${successCount} succeeded, ${errorCount} failed`;
  await loadPendingTransfers();
  emit("refresh");
}

function getStatusColor(transfer: any): string {
  return transfer.isPending ? "warning" : "success";
}

function getTimeoutColor(transfer: any): string {
  const now = Date.now() / 1000;
  const createdAt = transfer.created_at || 0;
  const timeout = transfer.timeout || 0;
  const expiresAt = createdAt + timeout;
  const timeLeft = expiresAt - now;

  if (timeLeft <= 0) return "error";
  if (timeLeft < 3600) return "warning";
  return "success";
}

function formatTimeout(timeout: number, timestamp: string): string {
  if (!timeout) return "No timeout";

  const now = Date.now() / 1000;
  const createdAt = Number(BigInt(timestamp || "0") / 1000000n) / 1000;
  const expiresAt = createdAt + timeout;
  const timeLeft = expiresAt - now;

  if (timeLeft <= 0) return "Expired";

  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);

  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
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
  return new Date(timestamp * 1000).toLocaleString();
}
</script>
