<template>
  <v-dialog :model-value="modelValue" max-width="700" persistent>
    <v-card>
      <v-card-title class="d-flex align-center pa-4 bg-surface-variant">
        <v-icon icon="mdi-account-plus" class="mr-2" color="primary" />
        <span class="text-h5">Create Account</span>
      </v-card-title>

      <v-card-text class="pa-6">
        <v-form ref="formRef" @submit.prevent="handleCreate">
          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="formData.alias"
                label="Account Alias *"
                hint="A friendly name for this account"
                persistent-hint
                variant="outlined"
                density="comfortable"
                :rules="[(v) => !!v || 'Alias is required']"
                prepend-inner-icon="mdi-tag"
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.id"
                label="Account ID"
                hint="Leave empty to auto-generate (128-bit unsigned integer)"
                persistent-hint
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-identifier"
                :rules="[
                  (v) =>
                    !v ||
                    isValidTBID(v) ||
                    `Must be a valid 128-bit ID (0 to ${MAX_TB_ID})`,
                ]"
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
                hint="Account code/type (0-65535)"
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
                          v-model="formData.user_data_128"
                          label="User Data 128"
                          hint="128-bit custom data (0 to 340282366920938463463374607431768211455)"
                          persistent-hint
                          variant="outlined"
                          density="comfortable"
                          :rules="[
                            (v) =>
                              !v ||
                              isValidTBID(v) ||
                              'Must be a valid 128-bit unsigned integer',
                          ]"
                        />
                      </v-col>
                      <v-col cols="12" md="6">
                        <v-text-field
                          v-model="formData.user_data_64"
                          label="User Data 64"
                          hint="64-bit custom data (0 to 18446744073709551615)"
                          persistent-hint
                          variant="outlined"
                          density="comfortable"
                          :rules="[
                            (v) =>
                              !v ||
                              (isValidTBID(v) &&
                                BigInt(v || '0') <=
                                  BigInt('18446744073709551615')) ||
                              'Must be a valid 64-bit unsigned integer',
                          ]"
                        />
                      </v-col>
                      <v-col cols="12" md="6">
                        <v-text-field
                          v-model.number="formData.user_data_32"
                          label="User Data 32"
                          type="number"
                          hint="32-bit custom data (0-4294967295)"
                          persistent-hint
                          variant="outlined"
                          density="comfortable"
                          :rules="[
                            (v) =>
                              v === null ||
                              v === undefined ||
                              v === '' ||
                              (v >= 0 && v <= 4294967295) ||
                              'Must be 0-4294967295',
                          ]"
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
            Account created successfully! ID: <code>{{ success }}</code>
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
          Create Account
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { isValidTBID, MAX_TB_ID } from "@/utils/bigint";
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
  alias: "",
  id: "",
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
    const result = await window.tigerBeetleApi.createAccount({
      alias: formData.value.alias,
      id: formData.value.id || undefined,
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
      error.value = result.error || "Failed to create account";
    }
  } catch (err: any) {
    error.value = err.message || "Failed to create account";
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  formData.value = {
    alias: "",
    id: "",
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
