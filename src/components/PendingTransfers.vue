<template>
  <div>
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between pa-4">
        <div class="d-flex align-center">
          <v-icon icon="mdi-clock-outline" class="mr-2" color="warning" />
          <span class="text-h5">Pending Transfers</span>
        </div>

        <div class="d-flex align-center gap-2">
          <v-btn-toggle
            v-model="statusFilter"
            density="compact"
            variant="outlined"
            mandatory
          >
            <v-btn value="open" size="small">Open</v-btn>
            <v-btn value="all" size="small">All</v-btn>
          </v-btn-toggle>
          <v-btn
            icon="mdi-refresh"
            variant="text"
            :loading="loading"
            @click="load"
          />
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

      <v-alert
        v-if="notice"
        type="success"
        variant="tonal"
        class="ma-4"
        closable
        @click:close="notice = null"
      >
        {{ notice }}
      </v-alert>

      <v-divider />

      <v-card-text class="pa-0">
        <v-data-table
          :headers="headers"
          :items="visibleRows"
          :loading="loading"
          density="comfortable"
          :items-per-page="-1"
          hide-default-footer
        >
          <template #item.id="{ item }">
            <span class="font-mono text-caption">{{ item.id }}</span>
          </template>

          <template #item.accounts="{ item }">
            <div class="text-caption font-mono">
              <div>
                <v-icon size="x-small" color="error">mdi-arrow-up</v-icon>
                {{ item.debit_account_id }}
              </div>
              <div>
                <v-icon size="x-small" color="success">mdi-arrow-down</v-icon>
                {{ item.credit_account_id }}
              </div>
            </div>
          </template>

          <template #item.amount="{ item }">
            <span class="font-weight-medium">
              {{ formatAmount(item.amount, item.ledger) }}
            </span>
          </template>

          <template #item.status="{ item }">
            <v-chip size="small" :color="statusColor(item.status)" variant="tonal">
              {{ statusLabel(item.status) }}
            </v-chip>
          </template>

          <template #item.expires="{ item }">
            <span v-if="item.timeout > 0" class="text-caption">
              {{ formatTBTimestamp(item.expiresAt, true) }}
            </span>
            <span v-else class="text-caption text-medium-emphasis">Never</span>
          </template>

          <template #item.timestamp="{ item }">
            <span class="text-caption">
              {{ formatTBTimestamp(item.timestamp, true) }}
            </span>
          </template>

          <template #item.actions="{ item }">
            <div v-if="item.status === 'open'" class="d-flex gap-1">
              <v-btn
                size="small"
                color="success"
                variant="tonal"
                :disabled="!isConnected || busyId === item.id"
                :loading="busyId === item.id && busyAction === 'post'"
                @click="openPostDialog(item)"
              >
                Post
              </v-btn>
              <v-btn
                size="small"
                color="error"
                variant="tonal"
                :disabled="!isConnected || busyId === item.id"
                :loading="busyId === item.id && busyAction === 'void'"
                @click="confirmVoid(item)"
              >
                Void
              </v-btn>
            </div>
            <span v-else class="text-caption text-medium-emphasis">—</span>
          </template>

          <template #no-data>
            <div class="pa-8 text-center">
              <v-icon size="48" color="grey-lighten-1">
                mdi-clock-check-outline
              </v-icon>
              <div class="text-h6 mt-2">
                {{
                  statusFilter === "open"
                    ? "No open pending transfers"
                    : "No pending transfers found"
                }}
              </div>
              <div class="text-body-2 text-medium-emphasis">
                Create a transfer with the <strong>pending</strong> flag to
                reserve funds for later resolution.
              </div>
            </div>
          </template>
        </v-data-table>
      </v-card-text>

      <v-divider />
      <v-card-text class="text-caption text-medium-emphasis">
        Scanned the {{ scanned }} most recent transfers (up to
        {{ SCAN_LIMIT }}). A pending transfer is shown as resolved once a
        matching post or void appears in that window.
      </v-card-text>
    </v-card>

    <!-- Post dialog (supports partial posting) -->
    <v-dialog v-model="postDialog" max-width="480">
      <v-card>
        <v-card-title class="pa-4">Post pending transfer</v-card-title>
        <v-card-text>
          <div class="text-body-2 mb-3">
            Reserved amount:
            <strong>
              {{ target ? formatAmount(target.amount, target.ledger) : "" }}
            </strong>
          </div>
          <v-checkbox
            v-model="postFull"
            label="Post the full reserved amount"
            density="compact"
            hide-details
          />
          <v-text-field
            v-if="!postFull"
            v-model="partialAmount"
            label="Amount to post"
            variant="outlined"
            density="comfortable"
            class="mt-3"
            :hint="`Any remainder is voided automatically. Max ${
              target ? formatAmount(target.amount, target.ledger) : ''
            }`"
            persistent-hint
          />
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="postDialog = false">Cancel</v-btn>
          <v-btn
            color="success"
            variant="flat"
            :loading="busyAction === 'post'"
            @click="doPost"
          >
            Post
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { useCurrency } from "@/composables/useCurrency";
import { useEnvironment } from "@/composables/useEnvironment";
import {
  TransferFlags,
  flagsToBits,
  hasFlag,
} from "@/constants/tigerbeetle-flags";
import {
  formatTBAmount,
  formatTBTimestamp,
  parseTBAmount,
} from "@/utils/bigint";
import { computed, onActivated, onMounted, ref, watch } from "vue";

interface Props {
  isConnected: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{ refresh: [] }>();

const { getCurrencyForLedger } = useCurrency();
const { confirmWrite } = useEnvironment();

// The cluster caps a page by message size, so scan several pages rather than
// asking for one huge one - a single large request comes back truncated and
// reservations older than that window would silently disappear from this view.
const SCAN_LIMIT = 2000;
const PAGE_SIZE = 200;

const loading = ref(false);
const error = ref<string | null>(null);
const notice = ref<string | null>(null);
const rows = ref<any[]>([]);
const scanned = ref(0);
const statusFilter = ref<"open" | "all">("open");

const busyId = ref<string | null>(null);
const busyAction = ref<"post" | "void" | null>(null);
const postDialog = ref(false);
const postFull = ref(true);
const partialAmount = ref("");
const target = ref<any | null>(null);

const headers = [
  { title: "Transfer ID", key: "id", sortable: false },
  { title: "Debit / Credit", key: "accounts", sortable: false },
  { title: "Amount", key: "amount", align: "end" as const, sortable: false },
  { title: "Status", key: "status", sortable: false },
  { title: "Created", key: "timestamp", sortable: false },
  { title: "Expires", key: "expires", sortable: false },
  { title: "", key: "actions", sortable: false, align: "end" as const },
];

const visibleRows = computed(() =>
  statusFilter.value === "open"
    ? rows.value.filter((r) => r.status === "open")
    : rows.value
);

function formatAmount(value: string, ledger?: number): string {
  return ledger !== undefined
    ? formatTBAmount(value, getCurrencyForLedger(ledger))
    : formatTBAmount(value);
}

function statusColor(status: string): string {
  return (
    { open: "warning", posted: "success", voided: "grey", expired: "error" }[
      status
    ] || "grey"
  );
}

function statusLabel(status: string): string {
  return (
    { open: "Open", posted: "Posted", voided: "Voided", expired: "Expired" }[
      status
    ] || status
  );
}

/**
 * TigerBeetle has no "list unresolved pending transfers" query, so scan a
 * window of recent transfers and pair each pending transfer with the post or
 * void that references it.
 */
function classify(transfers: any[]) {
  const resolutions = new Map<string, "posted" | "voided">();

  for (const t of transfers) {
    const flags = flagsToBits(t.flags, TransferFlags);
    if (!t.pending_id || t.pending_id === "0") continue;
    if (hasFlag(flags, TransferFlags.post_pending_transfer)) {
      resolutions.set(t.pending_id, "posted");
    } else if (hasFlag(flags, TransferFlags.void_pending_transfer)) {
      resolutions.set(t.pending_id, "voided");
    }
  }

  const nowNs = BigInt(Date.now()) * 1_000_000n;

  return transfers
    .filter((t) => hasFlag(flagsToBits(t.flags, TransferFlags), TransferFlags.pending))
    .map((t) => {
      const timeout = Number(t.timeout) || 0;
      let expiresAt = "0";
      let expired = false;

      try {
        const created = BigInt(t.timestamp || "0");
        if (timeout > 0) {
          const expiry = created + BigInt(timeout) * 1_000_000_000n;
          expiresAt = expiry.toString();
          expired = expiry <= nowNs;
        }
      } catch {
        /* leave defaults */
      }

      const resolution = resolutions.get(t.id);
      const status = resolution ?? (expired ? "expired" : "open");

      return { ...t, timeout, expiresAt, status };
    });
}

async function load() {
  if (!props.isConnected) {
    rows.value = [];
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    const transfers: any[] = [];
    let cursor: string | null = null;

    while (transfers.length < SCAN_LIMIT) {
      const result = await window.tigerBeetleApi.getTransfers(
        PAGE_SIZE,
        cursor,
        "next"
      );

      if (!result.success) {
        error.value = result.error || "Failed to load transfers";
        break;
      }

      const data: any = result.data;
      const page = Array.isArray(data) ? data : (data?.data ?? []);
      transfers.push(...page);

      if (Array.isArray(data) || !data?.hasMore || !data?.nextCursor) break;
      cursor = data.nextCursor;
    }

    scanned.value = transfers.length;
    rows.value = classify(transfers);
  } catch (err: any) {
    error.value = err?.message || "Failed to load transfers";
  } finally {
    loading.value = false;
  }
}

function openPostDialog(item: any) {
  target.value = item;
  postFull.value = true;
  partialAmount.value = "";
  postDialog.value = true;
}

async function doPost() {
  if (!target.value) return;
  if (!confirmWrite(`Post pending transfer ${target.value.id}.`)) return;

  busyId.value = target.value.id;
  busyAction.value = "post";
  error.value = null;

  try {
    let amount: string | undefined;
    if (!postFull.value) {
      const currency = getCurrencyForLedger(target.value.ledger);
      amount = parseTBAmount(partialAmount.value, currency);
      if (BigInt(amount) <= 0n) {
        error.value = "Amount to post must be greater than zero";
        return;
      }
      if (BigInt(amount) > BigInt(target.value.amount)) {
        error.value = "Amount to post exceeds the reserved amount";
        return;
      }
    }

    const result = await window.tigerBeetleApi.postPendingTransfer(
      target.value.id,
      amount
    );

    if (result.success) {
      notice.value = `Posted pending transfer ${target.value.id}`;
      postDialog.value = false;
      emit("refresh");
      await load();
    } else {
      error.value = result.error || "Failed to post transfer";
    }
  } catch (err: any) {
    error.value = err?.message || "Failed to post transfer";
  } finally {
    busyId.value = null;
    busyAction.value = null;
  }
}

async function confirmVoid(item: any) {
  if (!confirmWrite(`Void pending transfer ${item.id}.`)) return;
  if (
    !confirm(
      `Void pending transfer ${item.id}? The reserved funds are released and nothing is posted.`
    )
  ) {
    return;
  }

  busyId.value = item.id;
  busyAction.value = "void";
  error.value = null;

  try {
    const result = await window.tigerBeetleApi.voidPendingTransfer(item.id);
    if (result.success) {
      notice.value = `Voided pending transfer ${item.id}`;
      emit("refresh");
      await load();
    } else {
      error.value = result.error || "Failed to void transfer";
    }
  } catch (err: any) {
    error.value = err?.message || "Failed to void transfer";
  } finally {
    busyId.value = null;
    busyAction.value = null;
  }
}

onMounted(load);
onActivated(load);
watch(
  () => props.isConnected,
  (connected) => {
    if (connected) load();
  }
);
</script>
