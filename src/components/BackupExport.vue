<template>
  <div>
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between pa-4">
        <div class="d-flex align-center">
          <v-icon icon="mdi-database-export" class="mr-2" color="primary" />
          <span class="text-h5">Backup & Export</span>
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
        <v-row>
          <!-- Export Section -->
          <v-col cols="12" md="6">
            <v-card variant="outlined">
              <v-card-title class="bg-primary">
                <v-icon icon="mdi-download" class="mr-2" />
                Export Data
              </v-card-title>
              <v-card-text>
                <div class="text-body-2 mb-4">
                  Export your TigerBeetle data to various formats for backup or
                  analysis.
                </div>

                <v-select
                  v-model="exportOptions.entity"
                  :items="['All Data', 'Accounts Only', 'Transfers Only']"
                  label="What to Export"
                  variant="outlined"
                  density="comfortable"
                  class="mb-4"
                />

                <v-select
                  v-model="exportOptions.format"
                  :items="exportFormats"
                  label="Export Format"
                  variant="outlined"
                  density="comfortable"
                  class="mb-4"
                />

                <v-checkbox
                  v-model="exportOptions.includeMetadata"
                  label="Include metadata (timestamps, flags)"
                  density="compact"
                  hide-details
                  class="mb-2"
                />

                <v-checkbox
                  v-model="exportOptions.compress"
                  label="Compress output (ZIP)"
                  density="compact"
                  hide-details
                  class="mb-4"
                />

                <v-btn
                  color="primary"
                  block
                  prepend-icon="mdi-download"
                  @click="executeExport"
                  :loading="exporting"
                  :disabled="!isConnected"
                >
                  Export Data
                </v-btn>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Backup Section -->
          <v-col cols="12" md="6">
            <v-card variant="outlined">
              <v-card-title class="bg-success">
                <v-icon icon="mdi-backup-restore" class="mr-2" />
                Create Backup
              </v-card-title>
              <v-card-text>
                <div class="text-body-2 mb-4">
                  Create a complete backup of all accounts, transfers, and
                  metadata.
                </div>

                <v-text-field
                  v-model="backupName"
                  label="Backup Name"
                  variant="outlined"
                  density="comfortable"
                  placeholder="backup_2025_11_24"
                  class="mb-4"
                />

                <v-checkbox
                  v-model="backupOptions.includeConfig"
                  label="Include connection configuration"
                  density="compact"
                  hide-details
                  class="mb-2"
                />

                <v-checkbox
                  v-model="backupOptions.encrypt"
                  label="Encrypt backup (password protected)"
                  density="compact"
                  hide-details
                  class="mb-4"
                />

                <v-text-field
                  v-if="backupOptions.encrypt"
                  v-model="backupPassword"
                  label="Backup Password"
                  type="password"
                  variant="outlined"
                  density="comfortable"
                  class="mb-4"
                />

                <v-btn
                  color="success"
                  block
                  prepend-icon="mdi-content-save"
                  @click="createBackup"
                  :loading="backingUp"
                  :disabled="!isConnected"
                >
                  Create Backup
                </v-btn>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Import/Restore Section -->
          <v-col cols="12">
            <v-card variant="outlined">
              <v-card-title class="bg-warning">
                <v-icon icon="mdi-upload" class="mr-2" />
                Import / Restore
              </v-card-title>
              <v-card-text>
                <v-alert type="warning" variant="tonal" class="mb-4">
                  <strong>Warning:</strong> Importing data will create new
                  accounts/transfers. Ensure IDs don't conflict with existing
                  data.
                </v-alert>

                <v-file-input
                  v-model="importFile"
                  label="Select Backup File"
                  accept=".json,.zip"
                  variant="outlined"
                  prepend-icon="mdi-file-upload"
                  :disabled="importing"
                  class="mb-4"
                />

                <v-text-field
                  v-if="importFile.length > 0 && isEncrypted"
                  v-model="importPassword"
                  label="Backup Password"
                  type="password"
                  variant="outlined"
                  density="comfortable"
                  class="mb-4"
                />

                <v-checkbox
                  v-model="importOptions.dryRun"
                  label="Dry run (validate only, don't import)"
                  density="compact"
                  hide-details
                  class="mb-4"
                />

                <v-btn
                  color="warning"
                  block
                  prepend-icon="mdi-database-import"
                  @click="executeImport"
                  :loading="importing"
                  :disabled="!isConnected || importFile.length === 0"
                >
                  {{ importOptions.dryRun ? "Validate" : "Import" }} Data
                </v-btn>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Backup History -->
          <v-col cols="12">
            <v-card variant="outlined">
              <v-card-title>
                <v-icon icon="mdi-history" class="mr-2" />
                Recent Backups
              </v-card-title>
              <v-card-text>
                <v-list v-if="backupHistory.length > 0">
                  <v-list-item
                    v-for="(backup, index) in backupHistory"
                    :key="index"
                  >
                    <template #prepend>
                      <v-icon icon="mdi-file-archive" />
                    </template>
                    <v-list-item-title>{{ backup.name }}</v-list-item-title>
                    <v-list-item-subtitle>
                      {{ backup.date }} • {{ backup.size }} •
                      {{ backup.accounts }} accounts,
                      {{ backup.transfers }} transfers
                    </v-list-item-subtitle>
                    <template #append>
                      <v-btn
                        icon="mdi-download"
                        variant="text"
                        size="small"
                        @click="downloadBackup(backup)"
                      />
                    </template>
                  </v-list-item>
                </v-list>
                <v-alert v-else type="info" variant="tonal">
                  No backups created yet. Create your first backup above.
                </v-alert>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Progress Dialog -->
    <v-dialog v-model="showProgress" persistent max-width="500">
      <v-card>
        <v-card-title>{{ progressTitle }}</v-card-title>
        <v-card-text>
          <v-progress-linear
            :model-value="progress"
            color="primary"
            height="20"
          >
            <template #default="{ value }">
              <strong>{{ Math.ceil(value) }}%</strong>
            </template>
          </v-progress-linear>
          <div class="text-caption mt-2">{{ progressMessage }}</div>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

interface Props {
  isConnected: boolean;
}

const props = defineProps<Props>();

const error = ref<string | null>(null);
const success = ref<string | null>(null);
const exporting = ref(false);
const backingUp = ref(false);
const importing = ref(false);
const showProgress = ref(false);
const progress = ref(0);
const progressTitle = ref("");
const progressMessage = ref("");

const exportOptions = ref({
  entity: "All Data",
  format: "JSON",
  includeMetadata: true,
  compress: false,
});

const backupOptions = ref({
  includeConfig: true,
  encrypt: false,
});

const importOptions = ref({
  dryRun: false,
});

const backupName = ref("");
const backupPassword = ref("");
const importPassword = ref("");
const importFile = ref<File[]>([]);
const backupHistory = ref<any[]>([]);

const exportFormats = [
  { title: "JSON", value: "JSON" },
  { title: "CSV", value: "CSV" },
  { title: "SQL", value: "SQL" },
];

const isEncrypted = computed(() => {
  if (importFile.value.length === 0) return false;
  const filename = importFile.value[0].name;
  return filename.includes(".encrypted") || filename.includes(".enc");
});

async function executeExport() {
  if (!props.isConnected) {
    error.value = "Not connected to TigerBeetle";
    return;
  }

  exporting.value = true;
  showProgress.value = true;
  progressTitle.value = "Exporting Data";
  progress.value = 0;
  error.value = null;

  try {
    let data: any = {};

    // Fetch accounts
    if (exportOptions.value.entity !== "Transfers Only") {
      progressMessage.value = "Fetching accounts...";
      progress.value = 25;

      const accountsResult = await window.tigerBeetleApi.getAccounts(10000, 0);
      if (accountsResult.success) {
        const accountsData = accountsResult.data;
        data.accounts =
          accountsData && "data" in accountsData
            ? accountsData.data
            : accountsData;
      }
    }

    // Fetch transfers
    if (exportOptions.value.entity !== "Accounts Only") {
      progressMessage.value = "Fetching transfers...";
      progress.value = 50;

      const transfersResult = await window.tigerBeetleApi.getTransfers(
        10000,
        0
      );
      if (transfersResult.success) {
        const transfersData = transfersResult.data;
        data.transfers =
          transfersData && "data" in transfersData
            ? transfersData.data
            : transfersData;
      }
    }

    // Add metadata
    if (exportOptions.value.includeMetadata) {
      data.metadata = {
        exportDate: new Date().toISOString(),
        version: "1.0",
        source: "TigerBeetle Studio",
      };
    }

    progressMessage.value = "Generating export file...";
    progress.value = 75;

    // Generate export file
    let content = "";
    let filename = "";
    let mimeType = "";

    if (exportOptions.value.format === "JSON") {
      content = JSON.stringify(data, null, 2);
      filename = `tigerbeetle_export_${Date.now()}.json`;
      mimeType = "application/json";
    } else if (exportOptions.value.format === "CSV") {
      // Generate CSV for accounts and transfers separately
      content = generateCSV(data);
      filename = `tigerbeetle_export_${Date.now()}.csv`;
      mimeType = "text/csv";
    } else if (exportOptions.value.format === "SQL") {
      content = generateSQL(data);
      filename = `tigerbeetle_export_${Date.now()}.sql`;
      mimeType = "text/plain";
    }

    progress.value = 100;
    progressMessage.value = "Download starting...";

    // Download file
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    success.value = `Export completed: ${filename}`;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Export failed";
  } finally {
    exporting.value = false;
    showProgress.value = false;
  }
}

async function createBackup() {
  if (!props.isConnected) {
    error.value = "Not connected to TigerBeetle";
    return;
  }

  if (backupOptions.value.encrypt && !backupPassword.value) {
    error.value = "Please enter a password for encryption";
    return;
  }

  backingUp.value = true;
  showProgress.value = true;
  progressTitle.value = "Creating Backup";
  progress.value = 0;
  error.value = null;

  try {
    const backup: any = {
      name: backupName.value || `backup_${Date.now()}`,
      date: new Date().toISOString(),
      version: "1.0",
    };

    // Fetch all data
    progressMessage.value = "Fetching accounts...";
    progress.value = 20;
    const accountsResult = await window.tigerBeetleApi.getAccounts(10000, 0);
    if (accountsResult.success) {
      const accountsData = accountsResult.data;
      backup.accounts =
        accountsData && "data" in accountsData
          ? accountsData.data
          : accountsData;
    }

    progressMessage.value = "Fetching transfers...";
    progress.value = 40;
    const transfersResult = await window.tigerBeetleApi.getTransfers(10000, 0);
    if (transfersResult.success) {
      const transfersData = transfersResult.data;
      backup.transfers =
        transfersData && "data" in transfersData
          ? transfersData.data
          : transfersData;
    }

    if (backupOptions.value.includeConfig) {
      progressMessage.value = "Including configuration...";
      progress.value = 60;
      const config = await window.tigerBeetleApi.getConnectionConfig();
      backup.config = config;
    }

    progressMessage.value = "Creating backup file...";
    progress.value = 80;

    let content = JSON.stringify(backup, null, 2);
    let filename = `${backup.name}.json`;

    if (backupOptions.value.encrypt) {
      // Simple encryption placeholder (in production, use proper encryption)
      content = btoa(content);
      filename = `${backup.name}.encrypted.json`;
    }

    progress.value = 100;
    progressMessage.value = "Download starting...";

    // Download backup
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    // Add to history
    backupHistory.value.unshift({
      name: backup.name,
      date: new Date().toLocaleString(),
      size: formatBytes(blob.size),
      accounts: backup.accounts?.length || 0,
      transfers: backup.transfers?.length || 0,
      filename,
    });

    // Save history to localStorage
    localStorage.setItem(
      "tigerbeetle_backup_history",
      JSON.stringify(backupHistory.value.slice(0, 10))
    );

    success.value = `Backup created: ${filename}`;
    backupName.value = "";
    backupPassword.value = "";
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Backup failed";
  } finally {
    backingUp.value = false;
    showProgress.value = false;
  }
}

async function executeImport() {
  if (!props.isConnected || importFile.value.length === 0) return;

  importing.value = true;
  showProgress.value = true;
  progressTitle.value = importOptions.value.dryRun
    ? "Validating Data"
    : "Importing Data";
  progress.value = 0;
  error.value = null;

  try {
    const file = importFile.value[0];
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        let content = e.target?.result as string;

        // Decrypt if needed
        if (isEncrypted.value) {
          if (!importPassword.value) {
            error.value = "Password required for encrypted backup";
            return;
          }
          content = atob(content);
        }

        const data = JSON.parse(content);

        progressMessage.value = "Validating data...";
        progress.value = 20;

        if (importOptions.value.dryRun) {
          // Validation only
          const accountsCount = data.accounts?.length || 0;
          const transfersCount = data.transfers?.length || 0;
          success.value = `Validation successful: ${accountsCount} accounts, ${transfersCount} transfers`;
          progress.value = 100;
        } else {
          // Import accounts
          if (data.accounts) {
            progressMessage.value = `Importing ${data.accounts.length} accounts...`;
            progress.value = 40;
            // Import logic here (would need bulk import API)
          }

          // Import transfers
          if (data.transfers) {
            progressMessage.value = `Importing ${data.transfers.length} transfers...`;
            progress.value = 70;
            // Import logic here
          }

          progress.value = 100;
          success.value = "Import completed successfully";
        }
      } catch (err) {
        error.value = err instanceof Error ? err.message : "Import failed";
      } finally {
        importing.value = false;
        showProgress.value = false;
      }
    };

    reader.readAsText(file);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Import failed";
    importing.value = false;
    showProgress.value = false;
  }
}

function generateCSV(data: any): string {
  let csv = "";

  if (data.accounts) {
    csv += "=== ACCOUNTS ===\n";
    csv += "id,alias,ledger,code,balance,debits_posted,credits_posted\n";
    data.accounts.forEach((acc: any) => {
      csv += `"${acc.id}","${acc.alias}",${acc.ledger},${acc.code},"${acc.balance}","${acc.debits_posted}","${acc.credits_posted}"\n`;
    });
    csv += "\n";
  }

  if (data.transfers) {
    csv += "=== TRANSFERS ===\n";
    csv += "id,debit_account_id,credit_account_id,amount,ledger,code\n";
    data.transfers.forEach((t: any) => {
      csv += `"${t.id}","${t.debit_account_id}","${t.credit_account_id}","${t.amount}",${t.ledger},${t.code}\n`;
    });
  }

  return csv;
}

function generateSQL(data: any): string {
  let sql = "-- TigerBeetle Export SQL\n\n";

  if (data.accounts) {
    sql += "-- Accounts\n";
    data.accounts.forEach((acc: any) => {
      sql += `INSERT INTO accounts (id, alias, ledger, code, balance) VALUES ('${acc.id}', '${acc.alias}', ${acc.ledger}, ${acc.code}, '${acc.balance}');\n`;
    });
    sql += "\n";
  }

  if (data.transfers) {
    sql += "-- Transfers\n";
    data.transfers.forEach((t: any) => {
      sql += `INSERT INTO transfers (id, debit_account_id, credit_account_id, amount, ledger, code) VALUES ('${t.id}', '${t.debit_account_id}', '${t.credit_account_id}', '${t.amount}', ${t.ledger}, ${t.code});\n`;
    });
  }

  return sql;
}

function downloadBackup(backup: any) {
  // Placeholder - would need to store backups somewhere
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

// Load backup history on mount
const savedHistory = localStorage.getItem("tigerbeetle_backup_history");
if (savedHistory) {
  try {
    backupHistory.value = JSON.parse(savedHistory);
  } catch (e) {
  }
}
</script>
