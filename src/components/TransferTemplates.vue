<template>
  <div>
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between pa-4">
        <div class="d-flex align-center">
          <v-icon
            icon="mdi-file-document-multiple"
            class="mr-2"
            color="primary"
          />
          <span class="text-h5">Transfer Templates</span>
        </div>
        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          @click="showCreateDialog = true"
        >
          New Template
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
        <!-- Templates Grid -->
        <v-row v-if="templates.length > 0">
          <v-col
            v-for="template in templates"
            :key="template.id"
            cols="12"
            md="6"
            lg="4"
          >
            <v-card variant="outlined" hover>
              <v-card-title class="d-flex align-center">
                <v-icon
                  :icon="template.icon"
                  class="mr-2"
                  :color="template.color"
                />
                {{ template.name }}
              </v-card-title>
              <v-card-subtitle>{{ template.description }}</v-card-subtitle>
              <v-card-text>
                <div class="text-caption mb-2">
                  <strong>Type:</strong> {{ template.type }}
                </div>
                <div class="text-caption mb-2">
                  <strong>Ledger:</strong> {{ template.ledger }} |
                  <strong>Code:</strong> {{ template.code }}
                </div>
                <div v-if="template.amount" class="text-caption mb-2">
                  <strong>Amount:</strong> {{ formatAmount(template.amount) }}
                </div>
                <div
                  v-if="template.variables && template.variables.length > 0"
                  class="text-caption"
                >
                  <strong>Variables:</strong>
                  {{ template.variables.join(", ") }}
                </div>
              </v-card-text>
              <v-card-actions>
                <v-btn
                  color="primary"
                  variant="flat"
                  prepend-icon="mdi-play"
                  @click="executeTemplate(template)"
                  :disabled="!isConnected"
                >
                  Execute
                </v-btn>
                <v-spacer />
                <v-btn
                  icon="mdi-pencil"
                  variant="text"
                  size="small"
                  @click="editTemplate(template)"
                />
                <v-btn
                  icon="mdi-delete"
                  variant="text"
                  size="small"
                  color="error"
                  @click="deleteTemplate(template.id)"
                />
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>

        <v-alert v-else type="info" variant="tonal">
          No templates created yet. Create your first template to get started!
        </v-alert>

        <!-- Predefined Templates -->
        <v-divider class="my-6" />
        <div class="text-h6 mb-4">Predefined Templates</div>
        <v-row>
          <v-col
            v-for="preset in presetTemplates"
            :key="preset.id"
            cols="12"
            md="6"
            lg="4"
          >
            <v-card variant="outlined" color="info">
              <v-card-title class="d-flex align-center">
                <v-icon :icon="preset.icon" class="mr-2" />
                {{ preset.name }}
              </v-card-title>
              <v-card-subtitle>{{ preset.description }}</v-card-subtitle>
              <v-card-actions>
                <v-btn
                  color="info"
                  variant="flat"
                  prepend-icon="mdi-content-copy"
                  @click="usePreset(preset)"
                >
                  Use Template
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Create/Edit Template Dialog -->
    <v-dialog v-model="showCreateDialog" max-width="800" persistent>
      <v-card>
        <v-card-title>
          {{ editingTemplate ? "Edit Template" : "Create Template" }}
        </v-card-title>
        <v-card-text>
          <v-form ref="formRef">
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="templateForm.name"
                  label="Template Name *"
                  variant="outlined"
                  density="comfortable"
                  :rules="[(v) => !!v || 'Required']"
                  prepend-inner-icon="mdi-label"
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-select
                  v-model="templateForm.type"
                  :items="templateTypes"
                  label="Template Type *"
                  variant="outlined"
                  density="comfortable"
                  :rules="[(v) => !!v || 'Required']"
                />
              </v-col>

              <v-col cols="12">
                <v-textarea
                  v-model="templateForm.description"
                  label="Description"
                  variant="outlined"
                  density="comfortable"
                  rows="2"
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="templateForm.ledger"
                  label="Ledger *"
                  type="number"
                  variant="outlined"
                  density="comfortable"
                  :rules="[
                    (v) => (v !== null && v !== undefined) || 'Required',
                  ]"
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="templateForm.code"
                  label="Code *"
                  type="number"
                  variant="outlined"
                  density="comfortable"
                  :rules="[
                    (v) => (v !== null && v !== undefined) || 'Required',
                  ]"
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-text-field
                  v-model="templateForm.debitAccount"
                  label="Debit Account (or variable)"
                  variant="outlined"
                  density="comfortable"
                  hint="Use {{variable}} for dynamic values"
                  persistent-hint
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-text-field
                  v-model="templateForm.creditAccount"
                  label="Credit Account (or variable)"
                  variant="outlined"
                  density="comfortable"
                  hint="Use {{variable}} for dynamic values"
                  persistent-hint
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-text-field
                  v-model="templateForm.amount"
                  label="Amount (or variable)"
                  variant="outlined"
                  density="comfortable"
                  hint="Use {{amount}} for dynamic values"
                  persistent-hint
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-select
                  v-model="templateForm.icon"
                  :items="iconOptions"
                  label="Icon"
                  variant="outlined"
                  density="comfortable"
                >
                  <template #item="{ props, item }">
                    <v-list-item v-bind="props">
                      <template #prepend>
                        <v-icon :icon="item.value" />
                      </template>
                    </v-list-item>
                  </template>
                </v-select>
              </v-col>

              <v-col cols="12">
                <v-checkbox
                  v-model="templateForm.isLinked"
                  label="Multi-leg transfer (linked)"
                  density="compact"
                  hint="Create multiple linked transfers atomically"
                  persistent-hint
                />
              </v-col>

              <v-col v-if="templateForm.isLinked" cols="12">
                <v-alert type="info" variant="tonal">
                  <strong>Linked Transfers:</strong> All transfers in this
                  template will be executed atomically. If any transfer fails,
                  all will be rolled back.
                </v-alert>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="closeDialog">Cancel</v-btn>
          <v-btn color="primary" @click="saveTemplate" :loading="saving">
            {{ editingTemplate ? "Update" : "Create" }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Execute Template Dialog -->
    <v-dialog v-model="showExecuteDialog" max-width="600" persistent>
      <v-card>
        <v-card-title
          >Execute Template: {{ selectedTemplate?.name }}</v-card-title
        >
        <v-card-text>
          <v-form ref="executeFormRef">
            <div v-if="templateVariables.length > 0">
              <div class="text-subtitle-2 mb-3">
                Fill in template variables:
              </div>
              <v-row>
                <v-col
                  v-for="variable in templateVariables"
                  :key="variable"
                  cols="12"
                >
                  <v-text-field
                    v-model="variableValues[variable]"
                    :label="variable"
                    variant="outlined"
                    density="comfortable"
                    :rules="[(v) => !!v || 'Required']"
                    :hint="getVariableHint(variable)"
                    persistent-hint
                  />
                </v-col>
              </v-row>
            </div>
            <v-alert v-else type="info" variant="tonal">
              This template has no variables. Click execute to create the
              transfer.
            </v-alert>

            <v-divider class="my-4" />

            <div class="text-subtitle-2 mb-2">Preview:</div>
            <v-card variant="outlined">
              <v-card-text>
                <div class="text-caption mb-1">
                  <strong>From:</strong>
                  {{ getResolvedValue(selectedTemplate?.debitAccount) }}
                </div>
                <div class="text-caption mb-1">
                  <strong>To:</strong>
                  {{ getResolvedValue(selectedTemplate?.creditAccount) }}
                </div>
                <div class="text-caption mb-1">
                  <strong>Amount:</strong>
                  {{ getResolvedValue(selectedTemplate?.amount) }}
                </div>
                <div class="text-caption">
                  <strong>Ledger:</strong> {{ selectedTemplate?.ledger }} |
                  <strong>Code:</strong> {{ selectedTemplate?.code }}
                </div>
              </v-card-text>
            </v-card>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="showExecuteDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            prepend-icon="mdi-play"
            @click="confirmExecute"
            :loading="executing"
          >
            Execute
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { formatTBAmount, isValidTBID, parseTBAmount } from "@/utils/bigint";
import { computed, onMounted, ref } from "vue";

interface Props {
  isConnected: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{ refresh: [] }>();

interface TransferTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  ledger: number;
  code: number;
  debitAccount?: string;
  creditAccount?: string;
  amount?: string;
  icon: string;
  color?: string;
  isLinked: boolean;
  variables?: string[];
}

const templates = ref<TransferTemplate[]>([]);
const showCreateDialog = ref(false);
const showExecuteDialog = ref(false);
const editingTemplate = ref<TransferTemplate | null>(null);
const selectedTemplate = ref<TransferTemplate | null>(null);
const error = ref<string | null>(null);
const success = ref<string | null>(null);
const saving = ref(false);
const executing = ref(false);
const formRef = ref();
const executeFormRef = ref();

const templateForm = ref({
  name: "",
  description: "",
  type: "Simple Transfer",
  ledger: 1,
  code: 1,
  debitAccount: "",
  creditAccount: "",
  amount: "",
  icon: "mdi-bank-transfer",
  isLinked: false,
});

const variableValues = ref<Record<string, string>>({});

const templateTypes = [
  "Simple Transfer",
  "Payment",
  "Refund",
  "Fee Collection",
  "Salary Payment",
  "Multi-leg Transfer",
  "Custom",
];

const iconOptions = [
  { title: "Bank Transfer", value: "mdi-bank-transfer" },
  { title: "Cash", value: "mdi-cash" },
  { title: "Credit Card", value: "mdi-credit-card" },
  { title: "Wallet", value: "mdi-wallet" },
  { title: "Gift", value: "mdi-gift" },
  { title: "Shopping", value: "mdi-shopping" },
  { title: "Account", value: "mdi-account-cash" },
];

const presetTemplates = [
  {
    id: "preset-payment",
    name: "Customer Payment",
    description: "Debit customer account, credit revenue",
    icon: "mdi-cash-register",
    type: "Payment",
    ledger: 1,
    code: 1,
    debitAccount: "{{customer_account}}",
    creditAccount: "{{revenue_account}}",
    amount: "{{amount}}",
  },
  {
    id: "preset-refund",
    name: "Customer Refund",
    description: "Debit revenue, credit customer account",
    icon: "mdi-cash-refund",
    type: "Refund",
    ledger: 1,
    code: 2,
    debitAccount: "{{revenue_account}}",
    creditAccount: "{{customer_account}}",
    amount: "{{amount}}",
  },
  {
    id: "preset-fee",
    name: "Fee Collection",
    description: "Debit customer, credit fees account",
    icon: "mdi-percent",
    type: "Fee Collection",
    ledger: 1,
    code: 3,
    debitAccount: "{{customer_account}}",
    creditAccount: "{{fees_account}}",
    amount: "{{fee_amount}}",
  },
];

const templateVariables = computed(() => {
  if (!selectedTemplate.value) return [];

  const variables = new Set<string>();
  const regex = /\{\{(\w+)\}\}/g;

  [
    selectedTemplate.value.debitAccount,
    selectedTemplate.value.creditAccount,
    selectedTemplate.value.amount,
  ].forEach((field) => {
    if (field) {
      let match;
      while ((match = regex.exec(field)) !== null) {
        variables.add(match[1]);
      }
    }
  });

  return Array.from(variables);
});

function extractVariables(template: TransferTemplate): string[] {
  const variables = new Set<string>();
  const regex = /\{\{(\w+)\}\}/g;

  [template.debitAccount, template.creditAccount, template.amount].forEach(
    (field) => {
      if (field) {
        let match;
        while ((match = regex.exec(field)) !== null) {
          variables.add(match[1]);
        }
      }
    }
  );

  return Array.from(variables);
}

function saveTemplate() {
  if (!formRef.value) return;

  formRef.value.validate().then((result: any) => {
    if (!result.valid) return;

    saving.value = true;

    const template: TransferTemplate = {
      id: editingTemplate.value?.id || `template_${Date.now()}`,
      name: templateForm.value.name,
      description: templateForm.value.description,
      type: templateForm.value.type,
      ledger: templateForm.value.ledger,
      code: templateForm.value.code,
      debitAccount: templateForm.value.debitAccount,
      creditAccount: templateForm.value.creditAccount,
      amount: templateForm.value.amount,
      icon: templateForm.value.icon,
      isLinked: templateForm.value.isLinked,
      variables: extractVariables({
        ...templateForm.value,
        id: "",
        icon: templateForm.value.icon,
      }),
    };

    if (editingTemplate.value) {
      const index = templates.value.findIndex(
        (t) => t.id === editingTemplate.value!.id
      );
      templates.value[index] = template;
      success.value = "Template updated successfully";
    } else {
      templates.value.push(template);
      success.value = "Template created successfully";
    }

    saveToLocalStorage();
    closeDialog();
    saving.value = false;
  });
}

function editTemplate(template: TransferTemplate) {
  editingTemplate.value = template;
  templateForm.value = {
    name: template.name,
    description: template.description,
    type: template.type,
    ledger: template.ledger,
    code: template.code,
    debitAccount: template.debitAccount || "",
    creditAccount: template.creditAccount || "",
    amount: template.amount || "",
    icon: template.icon,
    isLinked: template.isLinked,
  };
  showCreateDialog.value = true;
}

function deleteTemplate(id: string) {
  if (confirm("Delete this template?")) {
    templates.value = templates.value.filter((t) => t.id !== id);
    saveToLocalStorage();
    success.value = "Template deleted";
  }
}

function executeTemplate(template: TransferTemplate) {
  selectedTemplate.value = template;
  variableValues.value = {};
  showExecuteDialog.value = true;
}

function usePreset(preset: any) {
  templateForm.value = {
    name: preset.name,
    description: preset.description,
    type: preset.type,
    ledger: preset.ledger,
    code: preset.code,
    debitAccount: preset.debitAccount,
    creditAccount: preset.creditAccount,
    amount: preset.amount,
    icon: preset.icon,
    isLinked: false,
  };
  editingTemplate.value = null;
  showCreateDialog.value = true;
}

function getResolvedValue(value?: string): string {
  if (!value) return "N/A";

  let resolved = value;
  Object.entries(variableValues.value).forEach(([key, val]) => {
    resolved = resolved.replace(`{{${key}}}`, val);
  });

  return resolved;
}

function getVariableHint(variable: string): string {
  if (variable.includes("account")) return "Enter account ID";
  if (variable.includes("amount")) return "Enter amount (e.g., 100.50)";
  return "Enter value";
}

async function confirmExecute() {
  if (!props.isConnected || !selectedTemplate.value) return;

  if (executeFormRef.value) {
    const result = await executeFormRef.value.validate();
    if (!result.valid) return;
  }

  executing.value = true;
  error.value = null;

  try {
    const debitAccount = getResolvedValue(selectedTemplate.value.debitAccount);
    const creditAccount = getResolvedValue(
      selectedTemplate.value.creditAccount
    );
    const amountStr = getResolvedValue(selectedTemplate.value.amount);

    // Validate
    if (!isValidTBID(debitAccount)) {
      error.value = "Invalid debit account ID";
      return;
    }
    if (!isValidTBID(creditAccount)) {
      error.value = "Invalid credit account ID";
      return;
    }

    // Parse amount
    const amount = parseTBAmount(amountStr);

    const result = await window.tigerBeetleApi.createTransfer({
      debit_account_id: debitAccount,
      credit_account_id: creditAccount,
      amount,
      ledger: selectedTemplate.value.ledger,
      code: selectedTemplate.value.code,
    });

    if (result.success) {
      success.value = `Transfer executed successfully: ${formatAmount(amount)}`;
      showExecuteDialog.value = false;
      emit("refresh");
    } else {
      error.value = result.error || "Transfer failed";
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Execution failed";
  } finally {
    executing.value = false;
  }
}

function closeDialog() {
  showCreateDialog.value = false;
  editingTemplate.value = null;
  templateForm.value = {
    name: "",
    description: "",
    type: "Simple Transfer",
    ledger: 1,
    code: 1,
    debitAccount: "",
    creditAccount: "",
    amount: "",
    icon: "mdi-bank-transfer",
    isLinked: false,
  };
}

function formatAmount(value: string): string {
  return formatTBAmount(value);
}

function saveToLocalStorage() {
  localStorage.setItem(
    "tigerbeetle_transfer_templates",
    JSON.stringify(templates.value)
  );
}

onMounted(() => {
  const saved = localStorage.getItem("tigerbeetle_transfer_templates");
  if (saved) {
    try {
      templates.value = JSON.parse(saved);
    } catch (e) {
    }
  }
});
</script>
