<template>
  <div>
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between pa-4">
        <div class="d-flex align-center">
          <v-icon icon="mdi-book-cog" class="mr-2" color="primary" />
          <span class="text-h5">Ledger Configuration</span>
        </div>
        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          @click="showAddDialog = true"
        >
          Add Ledger
        </v-btn>
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
        <!-- Ledgers List -->
        <v-row v-if="ledgers.length > 0">
          <v-col v-for="ledger in ledgers" :key="ledger.id" cols="12" md="6">
            <v-card variant="outlined">
              <v-card-title class="d-flex align-center">
                <v-icon
                  icon="mdi-book-open-variant"
                  class="mr-2"
                  color="primary"
                />
                {{ ledger.name }}
              </v-card-title>
              <v-card-subtitle>Ledger ID: {{ ledger.id }}</v-card-subtitle>
              <v-card-text>
                <v-row>
                  <v-col cols="12">
                    <div class="text-caption text-grey mb-1">Currency</div>
                    <v-chip size="small" color="success">
                      {{ ledger.currency.symbol }} {{ ledger.currency.code }}
                    </v-chip>
                  </v-col>
                  <v-col cols="12" md="6">
                    <div class="text-caption text-grey mb-1">
                      Decimal Places
                    </div>
                    <div class="text-body-2">
                      {{ ledger.currency.decimals }}
                    </div>
                  </v-col>
                  <v-col cols="12" md="6">
                    <div class="text-caption text-grey mb-1">Currency Name</div>
                    <div class="text-body-2">{{ ledger.currency.name }}</div>
                  </v-col>
                  <v-col cols="12" v-if="ledger.description">
                    <div class="text-caption text-grey mb-1">Description</div>
                    <div class="text-body-2">{{ ledger.description }}</div>
                  </v-col>
                </v-row>

                <!-- Account Codes -->
                <v-divider class="my-3" />
                <div class="text-subtitle-2 mb-2">Account Codes</div>
                <v-chip
                  v-for="code in ledger.accountCodes"
                  :key="code.code"
                  size="small"
                  class="mr-1 mb-1"
                  :title="code.description"
                >
                  {{ code.code }}: {{ code.name }}
                </v-chip>
                <div
                  v-if="
                    !ledger.accountCodes || ledger.accountCodes.length === 0
                  "
                  class="text-caption text-grey"
                >
                  No account codes defined
                </div>

                <!-- Transfer Codes -->
                <v-divider class="my-3" />
                <div class="text-subtitle-2 mb-2">Transfer Codes</div>
                <v-chip
                  v-for="code in ledger.transferCodes"
                  :key="code.code"
                  size="small"
                  class="mr-1 mb-1"
                  color="info"
                  :title="code.description"
                >
                  {{ code.code }}: {{ code.name }}
                </v-chip>
                <div
                  v-if="
                    !ledger.transferCodes || ledger.transferCodes.length === 0
                  "
                  class="text-caption text-grey"
                >
                  No transfer codes defined
                </div>
              </v-card-text>
              <v-card-actions>
                <v-btn
                  variant="outlined"
                  prepend-icon="mdi-pencil"
                  @click="editLedger(ledger)"
                >
                  Edit
                </v-btn>
                <v-spacer />
                <v-btn
                  icon="mdi-delete"
                  variant="text"
                  size="small"
                  color="error"
                  @click="deleteLedger(ledger.id)"
                />
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>

        <v-alert v-else type="info" variant="tonal">
          No ledgers configured. Add your first ledger to get started.
        </v-alert>

        <!-- Global Currency Settings -->
        <v-divider class="my-6" />
        <div class="text-h6 mb-4">Global Currency Settings</div>
        <v-card variant="outlined">
          <v-card-text>
            <v-row>
              <v-col cols="12" md="6">
                <v-select
                  v-model="globalCurrency"
                  :items="currencyPresets"
                  item-title="name"
                  item-value="code"
                  label="Default Currency"
                  variant="outlined"
                  density="comfortable"
                  @update:model-value="updateGlobalCurrency"
                >
                  <template #item="{ props, item }">
                    <v-list-item v-bind="props">
                      <template #prepend>
                        <span class="text-h6 mr-2">{{ item.raw.symbol }}</span>
                      </template>
                      <template #subtitle>
                        {{ item.raw.code }} • {{ item.raw.decimals }} decimals
                      </template>
                    </v-list-item>
                  </template>
                </v-select>
              </v-col>
              <v-col cols="12" md="6">
                <v-alert type="info" variant="tonal">
                  This currency will be used for ledgers without specific
                  configuration
                </v-alert>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-card-text>
    </v-card>

    <!-- Add/Edit Ledger Dialog -->
    <v-dialog v-model="showAddDialog" max-width="800" persistent scrollable>
      <v-card>
        <v-card-title>
          {{ editingLedger ? "Edit Ledger" : "Add Ledger" }}
        </v-card-title>
        <v-card-text>
          <v-form ref="formRef">
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="ledgerForm.id"
                  label="Ledger ID *"
                  type="number"
                  variant="outlined"
                  density="comfortable"
                  :rules="[
                    (v) => (v !== null && v !== undefined) || 'Required',
                  ]"
                  :disabled="!!editingLedger"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="ledgerForm.name"
                  label="Ledger Name *"
                  variant="outlined"
                  density="comfortable"
                  :rules="[(v) => !!v || 'Required']"
                />
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="ledgerForm.description"
                  label="Description"
                  variant="outlined"
                  density="comfortable"
                  rows="2"
                />
              </v-col>

              <!-- Currency Settings -->
              <v-col cols="12">
                <div class="text-subtitle-1 mb-2">Currency Settings</div>
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="selectedCurrencyPreset"
                  :items="currencyPresets"
                  item-title="name"
                  item-value="code"
                  label="Currency Preset"
                  variant="outlined"
                  density="comfortable"
                  @update:model-value="applyCurrencyPreset"
                >
                  <template #item="{ props, item }">
                    <v-list-item v-bind="props">
                      <template #prepend>
                        <span class="text-h6 mr-2">{{ item.raw.symbol }}</span>
                      </template>
                    </v-list-item>
                  </template>
                </v-select>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="ledgerForm.currency.code"
                  label="Currency Code *"
                  variant="outlined"
                  density="comfortable"
                  :rules="[(v) => !!v || 'Required']"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="ledgerForm.currency.symbol"
                  label="Symbol *"
                  variant="outlined"
                  density="comfortable"
                  :rules="[(v) => !!v || 'Required']"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model.number="ledgerForm.currency.decimals"
                  label="Decimals *"
                  type="number"
                  variant="outlined"
                  density="comfortable"
                  :rules="[
                    (v) => (v !== null && v !== undefined) || 'Required',
                  ]"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="ledgerForm.currency.name"
                  label="Currency Name *"
                  variant="outlined"
                  density="comfortable"
                  :rules="[(v) => !!v || 'Required']"
                />
              </v-col>

              <!-- Account Codes -->
              <v-col cols="12">
                <v-divider class="my-2" />
                <div class="text-subtitle-1 mb-2">Account Codes</div>
                <div
                  v-for="(code, index) in ledgerForm.accountCodes"
                  :key="index"
                  class="mb-2"
                >
                  <v-row>
                    <v-col cols="3">
                      <v-text-field
                        v-model.number="code.code"
                        label="Code"
                        type="number"
                        variant="outlined"
                        density="compact"
                      />
                    </v-col>
                    <v-col cols="4">
                      <v-text-field
                        v-model="code.name"
                        label="Name"
                        variant="outlined"
                        density="compact"
                      />
                    </v-col>
                    <v-col cols="4">
                      <v-text-field
                        v-model="code.description"
                        label="Description"
                        variant="outlined"
                        density="compact"
                      />
                    </v-col>
                    <v-col cols="1">
                      <v-btn
                        icon="mdi-delete"
                        variant="text"
                        size="small"
                        @click="removeAccountCode(index)"
                      />
                    </v-col>
                  </v-row>
                </div>
                <v-btn
                  variant="outlined"
                  prepend-icon="mdi-plus"
                  size="small"
                  @click="addAccountCode"
                >
                  Add Account Code
                </v-btn>
              </v-col>

              <!-- Transfer Codes -->
              <v-col cols="12">
                <v-divider class="my-2" />
                <div class="text-subtitle-1 mb-2">Transfer Codes</div>
                <div
                  v-for="(code, index) in ledgerForm.transferCodes"
                  :key="index"
                  class="mb-2"
                >
                  <v-row>
                    <v-col cols="3">
                      <v-text-field
                        v-model.number="code.code"
                        label="Code"
                        type="number"
                        variant="outlined"
                        density="compact"
                      />
                    </v-col>
                    <v-col cols="4">
                      <v-text-field
                        v-model="code.name"
                        label="Name"
                        variant="outlined"
                        density="compact"
                      />
                    </v-col>
                    <v-col cols="4">
                      <v-text-field
                        v-model="code.description"
                        label="Description"
                        variant="outlined"
                        density="compact"
                      />
                    </v-col>
                    <v-col cols="1">
                      <v-btn
                        icon="mdi-delete"
                        variant="text"
                        size="small"
                        @click="removeTransferCode(index)"
                      />
                    </v-col>
                  </v-row>
                </div>
                <v-btn
                  variant="outlined"
                  prepend-icon="mdi-plus"
                  size="small"
                  @click="addTransferCode"
                >
                  Add Transfer Code
                </v-btn>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="closeDialog">Cancel</v-btn>
          <v-btn color="primary" @click="saveLedger" :loading="saving">
            {{ editingLedger ? "Update" : "Add" }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { useCurrency } from "@/composables/useCurrency";
import {
  globalCurrency as globalCurrencyRef,
  setGlobalCurrency,
  setLedgerConfig,
} from "@/stores/config";
import type { LedgerConfig } from "@/types/tigerbeetle";
import { onMounted, ref } from "vue";

const { updateLedgerConfigs, setGlobalCurrency: setGlobalCurrencyComposable } =
  useCurrency();

const error = ref<string | null>(null);
const success = ref<string | null>(null);
const showAddDialog = ref(false);
const editingLedger = ref<LedgerConfig | null>(null);
const saving = ref(false);
const formRef = ref();
const ledgers = ref<LedgerConfig[]>([]);
const globalCurrency = ref("USD");
const selectedCurrencyPreset = ref("USD");

interface CodeDefinition {
  code: number;
  name: string;
  description: string;
}

const ledgerForm = ref({
  id: 0,
  name: "",
  description: "",
  currency: {
    code: "USD",
    symbol: "$",
    decimals: 2,
    name: "US Dollar",
  },
  accountCodes: [] as CodeDefinition[],
  transferCodes: [] as CodeDefinition[],
});

const currencyPresets = [
  { code: "USD", symbol: "$", decimals: 2, name: "US Dollar" },
  { code: "EUR", symbol: "€", decimals: 2, name: "Euro" },
  { code: "GBP", symbol: "£", decimals: 2, name: "British Pound" },
  { code: "JPY", symbol: "¥", decimals: 0, name: "Japanese Yen" },
  { code: "LYD", symbol: "ل.د", decimals: 3, name: "دينار ليبي" },
  { code: "EGP", symbol: "ج.م", decimals: 2, name: "جنيه مصري" },
  { code: "TND", symbol: "د.ت", decimals: 3, name: "دينار تونسي" },
  { code: "SAR", symbol: "ر.س", decimals: 2, name: "ريال سعودي" },
  { code: "AED", symbol: "د.إ", decimals: 2, name: "درهم إماراتي" },
  { code: "BTC", symbol: "₿", decimals: 8, name: "Bitcoin" },
  { code: "ETH", symbol: "Ξ", decimals: 18, name: "Ethereum" },
  { code: "CUSTOM", symbol: "", decimals: 2, name: "Custom Currency" },
];

function saveLedger() {
  if (!formRef.value) return;

  formRef.value.validate().then((result: any) => {
    if (!result.valid) return;

    saving.value = true;

    const ledger: LedgerConfig = {
      id: ledgerForm.value.id,
      name: ledgerForm.value.name,
      currency: ledgerForm.value.currency,
      description: ledgerForm.value.description,
      accountCodes: ledgerForm.value.accountCodes,
      transferCodes: ledgerForm.value.transferCodes,
    };

    if (editingLedger.value) {
      const index = ledgers.value.findIndex(
        (l) => l.id === editingLedger.value!.id
      );
      ledgers.value[index] = ledger;
      success.value = "Ledger updated";
    } else {
      ledgers.value.push(ledger);
      success.value = "Ledger added";
    }

    // Save to config store
    setLedgerConfig(ledger.id, ledger);
    saveToLocalStorage();

    // Update currency composable
    updateLedgerConfigs(ledgers.value);

    closeDialog();
    saving.value = false;
  });
}

function editLedger(ledger: LedgerConfig) {
  editingLedger.value = ledger;
  ledgerForm.value = {
    id: ledger.id,
    name: ledger.name,
    description: ledger.description || "",
    currency: { ...ledger.currency },
    accountCodes: ledger.accountCodes ? [...ledger.accountCodes] : [],
    transferCodes: ledger.transferCodes ? [...ledger.transferCodes] : [],
  };
  showAddDialog.value = true;
}

function deleteLedger(id: number) {
  if (confirm("Delete this ledger configuration?")) {
    ledgers.value = ledgers.value.filter((l) => l.id !== id);
    saveToLocalStorage();
    success.value = "Ledger deleted";
  }
}

function applyCurrencyPreset(code: string) {
  const preset = currencyPresets.find((c) => c.code === code);
  if (preset) {
    ledgerForm.value.currency = { ...preset };
  }
}

function updateGlobalCurrency(code: string) {
  const preset = currencyPresets.find((c) => c.code === code);
  if (preset && preset.code !== "CUSTOM") {
    setGlobalCurrency(preset);
    setGlobalCurrencyComposable(preset);
    success.value = `Global currency set to ${preset.name}`;
  }
}

function addAccountCode() {
  ledgerForm.value.accountCodes.push({
    code: 0,
    name: "",
    description: "",
  });
}

function removeAccountCode(index: number) {
  ledgerForm.value.accountCodes.splice(index, 1);
}

function addTransferCode() {
  ledgerForm.value.transferCodes.push({
    code: 0,
    name: "",
    description: "",
  });
}

function removeTransferCode(index: number) {
  ledgerForm.value.transferCodes.splice(index, 1);
}

function closeDialog() {
  showAddDialog.value = false;
  editingLedger.value = null;
  ledgerForm.value = {
    id: 0,
    name: "",
    description: "",
    currency: {
      code: "USD",
      symbol: "$",
      decimals: 2,
      name: "US Dollar",
    },
    accountCodes: [],
    transferCodes: [],
  };
}

function saveToLocalStorage() {
  localStorage.setItem(
    "tigerbeetle_ledger_configs",
    JSON.stringify(ledgers.value)
  );

  // Update currency composable
  updateLedgerConfigs(ledgers.value);
}

onMounted(() => {
  // Load saved ledgers
  const saved = localStorage.getItem("tigerbeetle_ledger_configs");
  if (saved) {
    try {
      ledgers.value = JSON.parse(saved);
    } catch (e) {
    }
  }

  // Load global currency
  globalCurrency.value = globalCurrencyRef.value.code;
});
</script>
