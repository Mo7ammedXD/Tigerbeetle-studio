<template>
  <v-dialog :model-value="modelValue" max-width="600" persistent>
    <v-card>
      <v-card-title class="d-flex align-center pa-4 bg-surface-variant">
        <v-icon icon="mdi-connection" class="mr-2" color="primary" />
        <span class="text-h5">Connect to TigerBeetle</span>
      </v-card-title>

      <v-card-text class="pa-6">
        <v-form ref="formRef" @submit.prevent="handleConnect">
          <v-text-field
            v-model="clusterId"
            label="Cluster ID"
            hint="Default: 0"
            persistent-hint
            variant="outlined"
            density="comfortable"
            class="mb-4"
          />

          <div class="mb-2">
            <div class="text-subtitle-2 mb-2">Replica Addresses</div>
            <v-text-field
              v-for="(address, index) in replicaAddresses"
              :key="index"
              v-model="replicaAddresses[index]"
              variant="outlined"
              density="comfortable"
              placeholder="3000 or 127.0.0.1:3000"
              class="mb-2"
            >
              <template #append>
                <v-btn
                  v-if="replicaAddresses.length > 1"
                  icon="mdi-close"
                  size="small"
                  variant="text"
                  color="error"
                  @click="removeAddress(index)"
                />
              </template>
            </v-text-field>

            <v-btn
              variant="text"
              color="primary"
              prepend-icon="mdi-plus"
              @click="addAddress"
              size="small"
            >
              Add Replica
            </v-btn>
          </div>

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
          @click="handleConnect"
          :loading="loading"
          prepend-icon="mdi-connection"
        >
          Connect
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";

interface Props {
  modelValue: boolean;
}

defineProps<Props>();
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  connected: [];
}>();

const formRef = ref();
const clusterId = ref("0");
const replicaAddresses = ref(["3000"]);
const loading = ref(false);
const error = ref("");

function addAddress() {
  replicaAddresses.value.push("");
}

function removeAddress(index: number) {
  replicaAddresses.value.splice(index, 1);
}

async function handleConnect() {
  loading.value = true;
  error.value = "";

  try {
    if (!window.tigerBeetleApi) {
      throw new Error(
        "TigerBeetle API not available. Please restart the application."
      );
    }

    const result = await window.tigerBeetleApi.connect({
      cluster_id: clusterId.value,
      replica_addresses: replicaAddresses.value.filter((addr) => addr.trim()),
    });

    if (result.success) {
      emit("connected");
      emit("update:modelValue", false);
    } else {
      error.value = result.error || "Connection failed";
    }
  } catch (err: any) {
    error.value = err.message || "Connection failed";
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  try {
    const config = await window.tigerBeetleApi.getConnectionConfig();
    if (config) {
      clusterId.value = config.cluster_id;
      replicaAddresses.value = config.replica_addresses;
    }
  } catch (error) {
  }
});
</script>
