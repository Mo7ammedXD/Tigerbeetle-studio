<template>
  <v-dialog :model-value="modelValue" max-width="700" persistent>
    <v-card>
      <v-card-title class="d-flex align-center pa-4 bg-surface-variant">
        <v-icon icon="mdi-bank-transfer" class="mr-2" color="primary" />
        <span class="text-h5">Create Transfer</span>
      </v-card-title>

      <v-card-text class="pa-6">
        <v-form ref="formRef" @submit.prevent="handleCreate">
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.debit_account_id"
                label="From Account (Debit) *"
                hint="Account ID to debit from (128-bit ID)"
                persistent-hint
                variant="outlined"
                density="comfortable"
                :rules="[
                  (v) => !!v || 'Required',
                  (v) => isValidTBID(v) || 'Must be a valid account ID',
                ]"
                prepend-inner-icon="mdi-account-minus"
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.credit_account_id"
                label="To Account (Credit) *"
                hint="Account ID to credit to (128-bit ID)"
                persistent-hint
                variant="outlined"
                density="comfortable"
                :rules="[
                  (v) => !!v || 'Required',
                  (v) => isValidTBID(v) || 'Must be a valid account ID',
                ]"
                prepend-inner-icon="mdi-account-plus"
              />
            </v-col>

            <v-col cols="12">
              <v-text-field
                v-model="formData.amount"
                label="Amount *"
                hint="Transfer amount (e.g., 100.50 for $100.50)"
                persistent-hint
                variant="outlined"
                density="comfortable"
                :rules="[
                  (v) => !!v || 'Required',
                  (v) =>
                    /^\d+(\.\d{1,2})?$/.test(v) ||
                    'Must be a valid amount (e.g., 100.50)',
                  (v) => parseFloat(v) > 0 || 'Must be greater than 0',
                ]"
                prepend-inner-icon="mdi-currency-usd"
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                v-model.number="formData.ledger"
                label="Ledger *"
                type="number"
                hint="Ledger identifier (0-4294967295)"
                persistent-hint
                variant="outlined"
                density="comfortable"
                :rules="[
                  (v) =>
                    (v !== null && v !== undefined && v !== '') || 'Required',
                  (v) => v >= 0 || 'Must be >= 0',
                  (v) => v <= 4294967295 || 'Must be <= 4294967295',
                ]"
                prepend-inner-icon="mdi-book-open-variant"
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                v-model.number="formData.code"
                label="Code *"
                type="number"
                hint="Transfer code/type (0-65535)"
                persistent-hint
                variant="outlined"
                density="comfortable"
                :rules="[
                  (v) =>
                    (v !== null && v !== undefined && v !== '') || 'Required',
                  (v) => v >= 0 || 'Must be >= 0',
                  (v) => v <= 65535 || 'Must be <= 65535',
                ]"
                prepend-inner-icon="mdi-code-tags"
              />
            </v-col>

            <v-col cols="12">
              <v-expansion-panels variant="accordion">
                <v-expansion-panel>
                  <v-expansion-panel-title>
                    <v-icon icon="mdi-cog" class="mr-2" />
                    Advanced Options
                  </v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <v-row>
                      <v-col cols="12">
                        <v-text-field
                          v-model="formData.id"
                          label="Transfer ID"
                          hint="Leave empty to auto-generate (128-bit unsigned integer)"
                          persistent-hint
                          variant="outlined"
                          density="comfortable"
                          :rules="[
                            (v) =>
                              !v ||
                              isValidTBID(v) ||
                              `Must be a valid 128-bit ID (0 to ${MAX_TB_ID})`,
                          ]"
                        />
                      </v-col>
                      <v-col cols="12">
                        <v-text-field
                          v-model="formData.user_data_128"
                          label="User Data 128"
                          hint="128-bit custom data (BigInt)"
                          persistent-hint
                          variant="outlined"
                          density="comfortable"
                        />
                      </v-col>
                      <v-col cols="12" md="6">
                        <v-text-field
                          v-model="formData.user_data_64"
                          label="User Data 64"
                          hint="64-bit custom data (BigInt)"
                          persistent-hint
                          variant="outlined"
                          density="comfortable"
                        />
                      </v-col>
                      <v-col cols="12" md="6">
                        <v-text-field
                          v-model.number="formData.user_data_32"
                          label="User Data 32"
                          type="number"
                          hint="32-bit custom data"
                          persistent-hint
                          variant="outlined"
                          density="comfortable"
                        />
                      </v-col>
                    </v-row>
                  </v-expansion-panel-text>
                </v-expansion-panel>
              </v-expansion-panels>
            </v-col>
          </v-row>

          <v-alert
            v-if="error"
            type="error"
            variant="tonal"
            class="mt-4"
            closable
            @click:close="error = ''"
          >
            {{ error }}
          </v-alert>

          <v-alert v-if="success" type="success" variant="tonal" class="mt-4">
            Transfer created successfully! ID: <code>{{ success }}</code>
          </v-alert>
        </v-form>
      </v-card-text>

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn
          variant="text"
          @click="$emit('update:modelValue', false)"
          :disabled="loading"
        >
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          @click="handleCreate"
          :loading="loading"
          prepend-icon="mdi-check"
        >
          Create Transfer
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { isValidTBID, MAX_TB_ID, parseTBAmount } from "@/utils/bigint";
import { ref } from "vue";

interface Props {
  modelValue: boolean;
}

defineProps<Props>();
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  created: [];
}>();

const formRef = ref();
const loading = ref(false);
const error = ref("");
const success = ref("");

const formData = ref({
  id: "",
  debit_account_id: "",
  credit_account_id: "",
  amount: "",
  ledger: 1,
  code: 1,
  user_data_128: "",
  user_data_64: "",
  user_data_32: 0,
});

async function handleCreate() {
  const { valid } = await formRef.value.validate();
  if (!valid) return;

  loading.value = true;
  error.value = "";
  success.value = "";

  try {
    // Convert amount from decimal to integer (cents)
    const amountInCents = parseTBAmount(formData.value.amount);

    const result = await window.tigerBeetleApi.createTransfer({
      id: formData.value.id || undefined,
      debit_account_id: formData.value.debit_account_id,
      credit_account_id: formData.value.credit_account_id,
      amount: amountInCents,
      ledger: formData.value.ledger,
      code: formData.value.code,
      user_data_128: formData.value.user_data_128 || undefined,
      user_data_64: formData.value.user_data_64 || undefined,
      user_data_32: formData.value.user_data_32 || undefined,
    });

    if (result.success) {
      success.value = result.data?.id || "Unknown";
      setTimeout(() => {
        emit("created");
        emit("update:modelValue", false);
        resetForm();
      }, 1500);
    } else {
      error.value = result.error || "Failed to create transfer";
    }
  } catch (err: any) {
    error.value = err.message || "Failed to create transfer";
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  formData.value = {
    id: "",
    debit_account_id: "",
    credit_account_id: "",
    amount: "",
    ledger: 1,
    code: 1,
    user_data_128: "",
    user_data_64: "",
    user_data_32: 0,
  };
  error.value = "";
  success.value = "";
}
</script>
