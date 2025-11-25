<template>
  <div>
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between pa-4">
        <div class="d-flex align-center">
          <v-icon icon="mdi-file-upload" class="mr-2" color="primary" />
          <span class="text-h5">Bulk Operations</span>
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
        <v-tabs v-model="tab" color="primary">
          <v-tab value="accounts">
            <v-icon icon="mdi-account-multiple" class="mr-2" />
            Bulk Accounts
          </v-tab>
          <v-tab value="transfers">
            <v-icon icon="mdi-bank-transfer" class="mr-2" />
            Bulk Transfers
          </v-tab>
        </v-tabs>

        <v-window v-model="tab" class="mt-4">
          
          <v-window-item value="accounts">
            <v-card variant="outlined">
              <v-card-text>
                <div class="text-h6 mb-4">Import Accounts from CSV</div>

                <v-alert type="info" variant="tonal" class="mb-4">
                  <div class="text-subtitle-2 mb-2">CSV Format</div>
                  <code class="text-body-2">
                    alias,ledger,code,user_data_128,user_data_64,user_data_32<br />
                    "Cash Account",1,1001,"","",0<br />
                    "Revenue Account",1,2001,"","",0
                  </code>
                  <div class="mt-2">
                    <v-btn
                      size="small"
                      variant="outlined"
                      prepend-icon="mdi-download"
                      @click="downloadTemplate('accounts')"
                    >
                      Download Template
                    </v-btn>
                  </div>
                </v-alert>

                <v-file-input
                  v-model="accountsFile"
                  label="Select CSV File"
                  accept=".csv"
                  variant="outlined"
                  prepend-icon="mdi-file-delimited"
                  @change="parseAccountsCSV"
                  :disabled="processing"
                />

                <div v-if="accountsPreview.length > 0" class="mt-4">
                  <div class="d-flex align-center justify-space-between mb-2">
                    <span class="text-subtitle-1"
                      >Preview ({{ accountsPreview.length }} accounts)</span
                    >
                    <v-checkbox
                      v-model="dryRun"
                      label="Dry Run (validate only)"
                      density="compact"
                      hide-details
                    />
                  </div>

                  <v-data-table
                    :headers="accountPreviewHeaders"
                    :items="accountsPreview"
                    density="compact"
                    :items-per-page="5"
                    class="elevation-1"
                  >
                    <template #item.status="{ item }">
                      <v-chip
                        :color="item.status === 'valid' ? 'success' : 'error'"
                        size="small"
                      >
                        {{ item.status }}
                      </v-chip>
                    </template>
                  </v-data-table>

                  <v-card-actions class="px-0">
                    <v-btn
                      color="primary"
                      prepend-icon="mdi-upload"
                      @click="executeAccountsBulk"
                      :loading="processing"
                      :disabled="!hasValidAccounts"
                    >
                      {{ dryRun ? "Validate" : "Import" }}
                      {{ validAccountsCount }} Accounts
                    </v-btn>
                    <v-btn
                      variant="outlined"
                      @click="clearAccountsPreview"
                      :disabled="processing"
                    >
                      Clear
                    </v-btn>
                  </v-card-actions>
                </div>

                
                <v-card v-if="processing" variant="outlined" class="mt-4">
                  <v-card-text>
                    <div class="text-subtitle-2 mb-2">Processing...</div>
                    <v-progress-linear
                      :model-value="progress"
                      color="primary"
                      height="20"
                    >
                      <template #default="{ value }">
                        <strong>{{ Math.ceil(value) }}%</strong>
                      </template>
                    </v-progress-linear>
                    <div class="text-caption mt-2">
                      {{ processedCount }} / {{ totalCount }} processed
                    </div>
                  </v-card-text>
                </v-card>

                
                <v-card
                  v-if="results.length > 0"
                  variant="outlined"
                  class="mt-4"
                >
                  <v-card-text>
                    <div class="text-subtitle-2 mb-2">Results</div>
                    <div class="mb-2">
                      <v-chip color="success" size="small" class="mr-2">
                        {{ successCount }} succeeded
                      </v-chip>
                      <v-chip color="error" size="small">
                        {{ errorCount }} failed
                      </v-chip>
                    </div>
                    <v-list
                      density="compact"
                      max-height="300"
                      style="overflow-y: auto"
                    >
                      <v-list-item
                        v-for="(result, index) in results"
                        :key="index"
                        :class="result.success ? 'text-success' : 'text-error'"
                      >
                        <v-list-item-title>
                          {{ result.alias || result.id }}
                        </v-list-item-title>
                        <v-list-item-subtitle>
                          {{ result.success ? "Success" : result.error }}
                        </v-list-item-subtitle>
                      </v-list-item>
                    </v-list>
                  </v-card-text>
                </v-card>
              </v-card-text>
            </v-card>
          </v-window-item>

          
          <v-window-item value="transfers">
            <v-card variant="outlined">
              <v-card-text>
                <div class="text-h6 mb-4">Import Transfers from CSV</div>

                <v-alert type="info" variant="tonal" class="mb-4">
                  <div class="text-subtitle-2 mb-2">CSV Format</div>
                  <code class="text-body-2">
                    debit_account_id,credit_account_id,amount,ledger,code<br />
                    "123456789","987654321","100.50",1,1<br />
                    "123456789","555555555","50.00",1,1
                  </code>
                  <div class="mt-2">
                    <v-btn
                      size="small"
                      variant="outlined"
                      prepend-icon="mdi-download"
                      @click="downloadTemplate('transfers')"
                    >
                      Download Template
                    </v-btn>
                  </div>
                </v-alert>

                <v-file-input
                  v-model="transfersFile"
                  label="Select CSV File"
                  accept=".csv"
                  variant="outlined"
                  prepend-icon="mdi-file-delimited"
                  @change="parseTransfersCSV"
                  :disabled="processing"
                />

                <div v-if="transfersPreview.length > 0" class="mt-4">
                  <div class="d-flex align-center justify-space-between mb-2">
                    <span class="text-subtitle-1"
                      >Preview ({{ transfersPreview.length }} transfers)</span
                    >
                    <v-checkbox
                      v-model="dryRun"
                      label="Dry Run (validate only)"
                      density="compact"
                      hide-details
                    />
                  </div>

                  <v-data-table
                    :headers="transferPreviewHeaders"
                    :items="transfersPreview"
                    density="compact"
                    :items-per-page="5"
                    class="elevation-1"
                  >
                    <template #item.status="{ item }">
                      <v-chip
                        :color="item.status === 'valid' ? 'success' : 'error'"
                        size="small"
                      >
                        {{ item.status }}
                      </v-chip>
                    </template>
                    <template #item.amount="{ item }">
                      {{ formatAmount(item.amount) }}
                    </template>
                  </v-data-table>

                  <v-card-actions class="px-0">
                    <v-btn
                      color="primary"
                      prepend-icon="mdi-upload"
                      @click="executeTransfersBulk"
                      :loading="processing"
                      :disabled="!hasValidTransfers"
                    >
                      {{ dryRun ? "Validate" : "Import" }}
                      {{ validTransfersCount }} Transfers
                    </v-btn>
                    <v-btn
                      variant="outlined"
                      @click="clearTransfersPreview"
                      :disabled="processing"
                    >
                      Clear
                    </v-btn>
                  </v-card-actions>
                </div>

                
                <v-card v-if="processing" variant="outlined" class="mt-4">
                  <v-card-text>
                    <div class="text-subtitle-2 mb-2">Processing...</div>
                    <v-progress-linear
                      :model-value="progress"
                      color="primary"
                      height="20"
                    >
                      <template #default="{ value }">
                        <strong>{{ Math.ceil(value) }}%</strong>
                      </template>
                    </v-progress-linear>
                    <div class="text-caption mt-2">
                      {{ processedCount }} / {{ totalCount }} processed
                    </div>
                  </v-card-text>
                </v-card>

                <v-card
                  v-if="results.length > 0"
                  variant="outlined"
                  class="mt-4"
                >
                  <v-card-text>
                    <div class="text-subtitle-2 mb-2">Results</div>
                    <div class="mb-2">
                      <v-chip color="success" size="small" class="mr-2">
                        {{ successCount }} succeeded
                      </v-chip>
                      <v-chip color="error" size="small">
                        {{ errorCount }} failed
                      </v-chip>
                    </div>
                    <v-list
                      density="compact"
                      max-height="300"
                      style="overflow-y: auto"
                    >
                      <v-list-item
                        v-for="(result, index) in results"
                        :key="index"
                        :class="result.success ? 'text-success' : 'text-error'"
                      >
                        <v-list-item-title>
                          {{ result.debit_account_id }} →
                          {{ result.credit_account_id }}
                        </v-list-item-title>
                        <v-list-item-subtitle>
                          {{
                            result.success
                              ? `Success: ${formatAmount(result.amount)}`
                              : result.error
                          }}
                        </v-list-item-subtitle>
                      </v-list-item>
                    </v-list>
                  </v-card-text>
                </v-card>
              </v-card-text>
            </v-card>
          </v-window-item>
        </v-window>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { formatTBAmount, isValidTBID, parseTBAmount } from "@/utils/bigint";
import { computed, ref } from "vue";

interface Props {
  isConnected: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{ refresh: [] }>();

const tab = ref("accounts");
const error = ref<string | null>(null);
const success = ref<string | null>(null);
const processing = ref(false);
const dryRun = ref(false);

const accountsFile = ref<File[]>([]);
const transfersFile = ref<File[]>([]);
const accountsPreview = ref<any[]>([]);
const transfersPreview = ref<any[]>([]);

const progress = ref(0);
const processedCount = ref(0);
const totalCount = ref(0);
const results = ref<any[]>([]);

const accountPreviewHeaders = [
  { title: "Status", key: "status" },
  { title: "Alias", key: "alias" },
  { title: "Ledger", key: "ledger" },
  { title: "Code", key: "code" },
  { title: "Error", key: "error" },
];

const transferPreviewHeaders = [
  { title: "Status", key: "status" },
  { title: "From", key: "debit_account_id" },
  { title: "To", key: "credit_account_id" },
  { title: "Amount", key: "amount" },
  { title: "Ledger", key: "ledger" },
  { title: "Code", key: "code" },
  { title: "Error", key: "error" },
];

const hasValidAccounts = computed(() =>
  accountsPreview.value.some((a) => a.status === "valid")
);
const hasValidTransfers = computed(() =>
  transfersPreview.value.some((t) => t.status === "valid")
);
const validAccountsCount = computed(
  () => accountsPreview.value.filter((a) => a.status === "valid").length
);
const validTransfersCount = computed(
  () => transfersPreview.value.filter((t) => t.status === "valid").length
);
const successCount = computed(
  () => results.value.filter((r) => r.success).length
);
const errorCount = computed(
  () => results.value.filter((r) => !r.success).length
);

function parseAccountsCSV() {
  if (accountsFile.value.length === 0) return;

  const file = accountsFile.value[0];
  const reader = new FileReader();

  reader.onload = (e) => {
    const text = e.target?.result as string;
    const lines = text.split("\n").filter((line) => line.trim());
    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));

    accountsPreview.value = lines.slice(1).map((line, index) => {
      const values = line.split(",").map((v) => v.trim().replace(/"/g, ""));
      const account: any = {};

      headers.forEach((header, i) => {
        account[header] = values[i] || "";
      });

      
      const errors: string[] = [];
      if (!account.alias) errors.push("Missing alias");
      if (!account.ledger || isNaN(Number(account.ledger)))
        errors.push("Invalid ledger");
      if (!account.code || isNaN(Number(account.code)))
        errors.push("Invalid code");

      account.status = errors.length === 0 ? "valid" : "invalid";
      account.error = errors.join(", ");
      account.ledger = Number(account.ledger);
      account.code = Number(account.code);
      account.user_data_32 = account.user_data_32
        ? Number(account.user_data_32)
        : 0;

      return account;
    });
  };

  reader.readAsText(file);
}

function parseTransfersCSV() {
  if (transfersFile.value.length === 0) return;

  const file = transfersFile.value[0];
  const reader = new FileReader();

  reader.onload = (e) => {
    const text = e.target?.result as string;
    const lines = text.split("\n").filter((line) => line.trim());
    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));

    transfersPreview.value = lines.slice(1).map((line, index) => {
      const values = line.split(",").map((v) => v.trim().replace(/"/g, ""));
      const transfer: any = {};

      headers.forEach((header, i) => {
        transfer[header] = values[i] || "";
      });

      
      const errors: string[] = [];
      if (
        !transfer.debit_account_id ||
        !isValidTBID(transfer.debit_account_id)
      ) {
        errors.push("Invalid debit account ID");
      }
      if (
        !transfer.credit_account_id ||
        !isValidTBID(transfer.credit_account_id)
      ) {
        errors.push("Invalid credit account ID");
      }
      if (!transfer.amount || isNaN(parseFloat(transfer.amount))) {
        errors.push("Invalid amount");
      }
      if (!transfer.ledger || isNaN(Number(transfer.ledger)))
        errors.push("Invalid ledger");
      if (!transfer.code || isNaN(Number(transfer.code)))
        errors.push("Invalid code");

      transfer.status = errors.length === 0 ? "valid" : "invalid";
      transfer.error = errors.join(", ");
      transfer.ledger = Number(transfer.ledger);
      transfer.code = Number(transfer.code);

      
      if (transfer.status === "valid") {
        transfer.amount = parseTBAmount(transfer.amount);
      }

      return transfer;
    });
  };

  reader.readAsText(file);
}

async function executeAccountsBulk() {
  if (!props.isConnected) {
    error.value = "Not connected to TigerBeetle";
    return;
  }

  const validAccounts = accountsPreview.value.filter(
    (a) => a.status === "valid"
  );
  if (validAccounts.length === 0) return;

  processing.value = true;
  error.value = null;
  success.value = null;
  results.value = [];
  processedCount.value = 0;
  totalCount.value = validAccounts.length;
  progress.value = 0;

  if (dryRun.value) {
    success.value = `Validation successful: ${validAccounts.length} accounts are valid`;
    processing.value = false;
    return;
  }

  for (const account of validAccounts) {
    try {
      const result = await window.tigerBeetleApi.createAccount({
        alias: account.alias,
        ledger: account.ledger,
        code: account.code,
        user_data_128: account.user_data_128 || undefined,
        user_data_64: account.user_data_64 || undefined,
        user_data_32: account.user_data_32 || undefined,
      });

      results.value.push({
        ...account,
        success: result.success,
        error: result.error,
      });
    } catch (err) {
      results.value.push({
        ...account,
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }

    processedCount.value++;
    progress.value = (processedCount.value / totalCount.value) * 100;
  }

  processing.value = false;
  success.value = `Processed ${processedCount.value} accounts: ${successCount.value} succeeded, ${errorCount.value} failed`;
  emit("refresh");
}

async function executeTransfersBulk() {
  if (!props.isConnected) {
    error.value = "Not connected to TigerBeetle";
    return;
  }

  const validTransfers = transfersPreview.value.filter(
    (t) => t.status === "valid"
  );
  if (validTransfers.length === 0) return;

  processing.value = true;
  error.value = null;
  success.value = null;
  results.value = [];
  processedCount.value = 0;
  totalCount.value = validTransfers.length;
  progress.value = 0;

  if (dryRun.value) {
    success.value = `Validation successful: ${validTransfers.length} transfers are valid`;
    processing.value = false;
    return;
  }

  for (const transfer of validTransfers) {
    try {
      const result = await window.tigerBeetleApi.createTransfer({
        debit_account_id: transfer.debit_account_id,
        credit_account_id: transfer.credit_account_id,
        amount: transfer.amount,
        ledger: transfer.ledger,
        code: transfer.code,
      });

      results.value.push({
        ...transfer,
        success: result.success,
        error: result.error,
      });
    } catch (err) {
      results.value.push({
        ...transfer,
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }

    processedCount.value++;
    progress.value = (processedCount.value / totalCount.value) * 100;
  }

  processing.value = false;
  success.value = `Processed ${processedCount.value} transfers: ${successCount.value} succeeded, ${errorCount.value} failed`;
  emit("refresh");
}

function clearAccountsPreview() {
  accountsPreview.value = [];
  accountsFile.value = [];
  results.value = [];
}

function clearTransfersPreview() {
  transfersPreview.value = [];
  transfersFile.value = [];
  results.value = [];
}

function downloadTemplate(type: "accounts" | "transfers") {
  let content = "";
  let filename = "";

  if (type === "accounts") {
    content = "alias,ledger,code,user_data_128,user_data_64,user_data_32\n";
    content += '"Cash Account",1,1001,"","",0\n';
    content += '"Revenue Account",1,2001,"","",0\n';
    filename = "accounts_template.csv";
  } else {
    content = "debit_account_id,credit_account_id,amount,ledger,code\n";
    content += '"123456789","987654321","100.50",1,1\n';
    content += '"123456789","555555555","50.00",1,1\n';
    filename = "transfers_template.csv";
  }

  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatAmount(value: string): string {
  return formatTBAmount(value);
}
</script>
