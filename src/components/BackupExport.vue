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
import { computed, onMounted, ref } from "vue";
import { BackupService } from "../services/backup.service";
import { ExportService } from "../services/export.service";
import { ImportService } from "../services/import.service";
import type {
  BackupOptions,
  ExportOptions,
  ImportOptions,
} from "../types/backup.types";

const props = defineProps<{
  isConnected: boolean;
}>();

const error = ref<string | null>(null);
const success = ref<string | null>(null);
const exporting = ref(false);
const backingUp = ref(false);
const importing = ref(false);
const showProgress = ref(false);
const progress = ref(0);
const progressTitle = ref("");
const progressMessage = ref("");

const exportOptions = ref<{
  entity: string;
  format: string;
  includeMetadata: boolean;
  compress: boolean;
}>({
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
  error.value = null;

  try {
    const entityMap: Record<string, "all" | "accounts" | "transfers"> = {
      "All Data": "all",
      "Accounts Only": "accounts",
      "Transfers Only": "transfers",
    };

    const formatMap: Record<string, "json" | "csv" | "sql"> = {
      JSON: "json",
      CSV: "csv",
      SQL: "sql",
    };

    const options: ExportOptions = {
      entity: entityMap[exportOptions.value.entity] || "all",
      format: formatMap[exportOptions.value.format] || "json",
      includeMetadata: exportOptions.value.includeMetadata,
      compress: exportOptions.value.compress,
    };

    const result = await ExportService.exportData(
      options,
      (prog: number, msg: string) => {
        progress.value = prog;
        progressMessage.value = msg;
      }
    );

    if (result.success) {
      success.value = `Export completed: ${result.filename} (${formatBytes(
        result.size
      )})`;
    } else {
      error.value = result.error || "Export failed";
    }
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
  error.value = null;

  try {
    const options: BackupOptions = {
      name: backupName.value,
      includeConfig: backupOptions.value.includeConfig,
      encrypt: backupOptions.value.encrypt,
      password: backupPassword.value || undefined,
    };

    const result = await BackupService.createBackup(
      options,
      (prog: number, msg: string) => {
        progress.value = prog;
        progressMessage.value = msg;
      }
    );

    if (result.success) {
      success.value = `Backup created: ${result.filename} (${formatBytes(
        result.size
      )})`;
      backupName.value = "";
      backupPassword.value = "";
      loadBackupHistory();
    } else {
      error.value = result.error || "Backup failed";
    }
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
  error.value = null;

  try {
    const file = importFile.value[0];
    const options: ImportOptions = {
      dryRun: importOptions.value.dryRun,
      skipDuplicates: true,
    };

    const result = await ImportService.importFromFile(
      file,
      options,
      importPassword.value || undefined,
      (prog: number, msg: string) => {
        progress.value = prog;
        progressMessage.value = msg;
      }
    );

    if (result.success) {
      if (options.dryRun) {
        success.value = `Validation successful`;
      } else {
        success.value = `Import completed: ${result.accountsImported} accounts, ${result.transfersImported} transfers imported`;
        if (result.accountsSkipped > 0 || result.transfersSkipped > 0) {
          success.value += ` (${
            result.accountsSkipped + result.transfersSkipped
          } skipped)`;
        }
      }
      importFile.value = [];
      importPassword.value = "";
    } else {
      error.value = result.errors.join("\n") || "Import failed";
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Import failed";
  } finally {
    importing.value = false;
    showProgress.value = false;
  }
}

function loadBackupHistory() {
  backupHistory.value = BackupService.getHistory();
}

function downloadBackup(backup: any) {}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

onMounted(() => {
  loadBackupHistory();
});
</script>
