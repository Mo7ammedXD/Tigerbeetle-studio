<template>
  <div>
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between pa-4">
        <div class="d-flex align-center">
          <v-icon icon="mdi-server-network" class="mr-2" color="primary" />
          <span class="text-h5">Cluster Manager</span>
        </div>
        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          @click="showAddDialog = true"
        >
          Add Cluster
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
        <!-- Current Cluster -->
        <v-card variant="outlined" color="primary" class="mb-4">
          <v-card-title>
            <v-icon icon="mdi-check-circle" class="mr-2" />
            Current Cluster
          </v-card-title>
          <v-card-text v-if="currentCluster">
            <v-row>
              <v-col cols="12" md="6">
                <div class="text-caption text-grey mb-1">Name</div>
                <div class="text-h6">{{ currentCluster.name }}</div>
              </v-col>
              <v-col cols="12" md="6">
                <div class="text-caption text-grey mb-1">Cluster ID</div>
                <div class="text-body-1 font-mono">
                  {{ currentCluster.cluster_id }}
                </div>
              </v-col>
              <v-col cols="12">
                <div class="text-caption text-grey mb-1">Replica Addresses</div>
                <v-chip
                  v-for="(address, index) in currentCluster.replica_addresses"
                  :key="index"
                  size="small"
                  class="mr-1"
                >
                  {{ address }}
                </v-chip>
              </v-col>
              <v-col cols="12" md="6">
                <div class="text-caption text-grey mb-1">Status</div>
                <v-chip :color="isConnected ? 'success' : 'error'" size="small">
                  {{ isConnected ? "Connected" : "Disconnected" }}
                </v-chip>
              </v-col>
              <v-col cols="12" md="6">
                <div class="text-caption text-grey mb-1">Last Connected</div>
                <div class="text-body-2">
                  {{ formatDate(currentCluster.lastConnected) }}
                </div>
              </v-col>
            </v-row>
          </v-card-text>
          <v-card-text v-else>
            <v-alert type="info" variant="tonal">
              No cluster currently connected
            </v-alert>
          </v-card-text>
        </v-card>

        <!-- Saved Clusters -->
        <div class="text-h6 mb-4">Saved Clusters</div>
        <v-row v-if="clusters.length > 0">
          <v-col v-for="cluster in clusters" :key="cluster.id" cols="12" md="6">
            <v-card
              variant="outlined"
              :color="cluster.id === currentCluster?.id ? 'primary' : undefined"
            >
              <v-card-title class="d-flex align-center">
                <v-icon
                  :icon="
                    cluster.id === currentCluster?.id
                      ? 'mdi-check-circle'
                      : 'mdi-server'
                  "
                  class="mr-2"
                />
                {{ cluster.name }}
              </v-card-title>
              <v-card-subtitle>
                Cluster ID: {{ cluster.cluster_id }}
              </v-card-subtitle>
              <v-card-text>
                <div class="text-caption mb-2">
                  <strong>Replicas:</strong>
                </div>
                <div class="mb-2">
                  <v-chip
                    v-for="(address, index) in cluster.replica_addresses"
                    :key="index"
                    size="x-small"
                    class="mr-1 mb-1"
                  >
                    {{ address }}
                  </v-chip>
                </div>
                <div class="text-caption">
                  <strong>Environment:</strong>
                  {{ cluster.environment || "Production" }}
                </div>
              </v-card-text>
              <v-card-actions>
                <v-btn
                  v-if="cluster.id !== currentCluster?.id"
                  color="primary"
                  variant="flat"
                  prepend-icon="mdi-connection"
                  @click="switchCluster(cluster)"
                  :loading="switching"
                >
                  Connect
                </v-btn>
                <v-chip v-else color="success" size="small"> Active </v-chip>
                <v-spacer />
                <v-btn
                  icon="mdi-pencil"
                  variant="text"
                  size="small"
                  @click="editCluster(cluster)"
                />
                <v-btn
                  icon="mdi-delete"
                  variant="text"
                  size="small"
                  color="error"
                  @click="deleteCluster(cluster.id)"
                  :disabled="cluster.id === currentCluster?.id"
                />
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>

        <v-alert v-else type="info" variant="tonal">
          No saved clusters. Add your first cluster to get started.
        </v-alert>

        <!-- Cluster Comparison -->
        <v-divider class="my-6" />
        <div class="text-h6 mb-4">Cluster Comparison</div>
        <v-card variant="outlined">
          <v-card-text>
            <v-simple-table v-if="clusters.length > 1">
              <template #default>
                <thead>
                  <tr>
                    <th>Cluster</th>
                    <th>Environment</th>
                    <th>Replicas</th>
                    <th>Status</th>
                    <th>Last Connected</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="cluster in clusters" :key="cluster.id">
                    <td>{{ cluster.name }}</td>
                    <td>
                      <v-chip
                        size="x-small"
                        :color="getEnvironmentColor(cluster.environment)"
                      >
                        {{ cluster.environment || "Production" }}
                      </v-chip>
                    </td>
                    <td>{{ cluster.replica_addresses.length }}</td>
                    <td>
                      <v-chip
                        size="x-small"
                        :color="
                          cluster.id === currentCluster?.id && isConnected
                            ? 'success'
                            : 'grey'
                        "
                      >
                        {{
                          cluster.id === currentCluster?.id && isConnected
                            ? "Connected"
                            : "Inactive"
                        }}
                      </v-chip>
                    </td>
                    <td>{{ formatDate(cluster.lastConnected) }}</td>
                  </tr>
                </tbody>
              </template>
            </v-simple-table>
            <v-alert v-else type="info" variant="tonal">
              Add more clusters to compare
            </v-alert>
          </v-card-text>
        </v-card>
      </v-card-text>
    </v-card>

    <!-- Add/Edit Cluster Dialog -->
    <v-dialog v-model="showAddDialog" max-width="600" persistent>
      <v-card>
        <v-card-title>
          {{ editingCluster ? "Edit Cluster" : "Add Cluster" }}
        </v-card-title>
        <v-card-text>
          <v-form ref="formRef">
            <v-text-field
              v-model="clusterForm.name"
              label="Cluster Name *"
              variant="outlined"
              density="comfortable"
              :rules="[(v) => !!v || 'Required']"
              class="mb-4"
            />

            <v-text-field
              v-model="clusterForm.cluster_id"
              label="Cluster ID *"
              variant="outlined"
              density="comfortable"
              :rules="[(v) => !!v || 'Required']"
              hint="Numeric cluster identifier"
              persistent-hint
              class="mb-4"
            />

            <v-select
              v-model="clusterForm.environment"
              :items="['Development', 'Staging', 'Production']"
              label="Environment"
              variant="outlined"
              density="comfortable"
              class="mb-4"
            />

            <div class="text-subtitle-2 mb-2">Replica Addresses *</div>
            <v-text-field
              v-for="(address, index) in clusterForm.replica_addresses"
              :key="index"
              v-model="clusterForm.replica_addresses[index]"
              variant="outlined"
              density="compact"
              :rules="[(v) => !!v || 'Required']"
              class="mb-2"
            >
              <template #append>
                <v-btn
                  v-if="clusterForm.replica_addresses.length > 1"
                  icon="mdi-delete"
                  variant="text"
                  size="small"
                  @click="removeReplica(index)"
                />
              </template>
            </v-text-field>
            <v-btn
              variant="outlined"
              prepend-icon="mdi-plus"
              size="small"
              @click="addReplica"
            >
              Add Replica
            </v-btn>

            <v-textarea
              v-model="clusterForm.notes"
              label="Notes"
              variant="outlined"
              density="comfortable"
              rows="2"
              class="mt-4"
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="closeDialog">Cancel</v-btn>
          <v-btn color="primary" @click="saveCluster" :loading="saving">
            {{ editingCluster ? "Update" : "Add" }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";

interface Props {
  isConnected: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{ clusterChanged: [] }>();

interface Cluster {
  id: string;
  name: string;
  cluster_id: string;
  replica_addresses: string[];
  environment?: string;
  notes?: string;
  lastConnected?: number;
}

const clusters = ref<Cluster[]>([]);
const currentCluster = ref<Cluster | null>(null);
const showAddDialog = ref(false);
const editingCluster = ref<Cluster | null>(null);
const error = ref<string | null>(null);
const success = ref<string | null>(null);
const saving = ref(false);
const switching = ref(false);
const formRef = ref();

const clusterForm = ref({
  name: "",
  cluster_id: "",
  replica_addresses: [""],
  environment: "Production",
  notes: "",
});

async function saveCluster() {
  if (!formRef.value) return;

  const result = await formRef.value.validate();
  if (!result.valid) return;

  saving.value = true;

  const cluster: Cluster = {
    id: editingCluster.value?.id || `cluster_${Date.now()}`,
    name: clusterForm.value.name,
    cluster_id: clusterForm.value.cluster_id,
    replica_addresses: clusterForm.value.replica_addresses.filter((a) =>
      a.trim()
    ),
    environment: clusterForm.value.environment,
    notes: clusterForm.value.notes,
    lastConnected: editingCluster.value?.lastConnected,
  };

  if (editingCluster.value) {
    const index = clusters.value.findIndex(
      (c) => c.id === editingCluster.value!.id
    );
    clusters.value[index] = cluster;
    success.value = "Cluster updated";
  } else {
    clusters.value.push(cluster);
    success.value = "Cluster added";
  }

  saveToLocalStorage();
  closeDialog();
  saving.value = false;
}

function editCluster(cluster: Cluster) {
  editingCluster.value = cluster;
  clusterForm.value = {
    name: cluster.name,
    cluster_id: cluster.cluster_id,
    replica_addresses: [...cluster.replica_addresses],
    environment: cluster.environment || "Production",
    notes: cluster.notes || "",
  };
  showAddDialog.value = true;
}

function deleteCluster(id: string) {
  if (confirm("Delete this cluster configuration?")) {
    clusters.value = clusters.value.filter((c) => c.id !== id);
    saveToLocalStorage();
    success.value = "Cluster deleted";
  }
}

async function switchCluster(cluster: Cluster) {
  if (!confirm(`Switch to cluster "${cluster.name}"?`)) return;

  switching.value = true;
  error.value = null;

  try {
    const result = await window.tigerBeetleApi.connect({
      cluster_id: cluster.cluster_id,
      replica_addresses: cluster.replica_addresses,
    });

    if (result.success) {
      currentCluster.value = cluster;
      cluster.lastConnected = Date.now();
      saveToLocalStorage();
      success.value = `Connected to ${cluster.name}`;
      emit("clusterChanged");
    } else {
      error.value = result.error || "Connection failed";
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Connection failed";
  } finally {
    switching.value = false;
  }
}

function addReplica() {
  clusterForm.value.replica_addresses.push("");
}

function removeReplica(index: number) {
  clusterForm.value.replica_addresses.splice(index, 1);
}

function closeDialog() {
  showAddDialog.value = false;
  editingCluster.value = null;
  clusterForm.value = {
    name: "",
    cluster_id: "",
    replica_addresses: [""],
    environment: "Production",
    notes: "",
  };
}

function getEnvironmentColor(env?: string): string {
  switch (env) {
    case "Development":
      return "info";
    case "Staging":
      return "warning";
    case "Production":
      return "success";
    default:
      return "grey";
  }
}

function formatDate(timestamp?: number): string {
  if (!timestamp) return "Never";
  return new Date(timestamp).toLocaleString();
}

function saveToLocalStorage() {
  localStorage.setItem("tigerbeetle_clusters", JSON.stringify(clusters.value));
  if (currentCluster.value) {
    localStorage.setItem(
      "tigerbeetle_current_cluster",
      JSON.stringify(currentCluster.value)
    );
  }
}

onMounted(async () => {
  // Load saved clusters
  const saved = localStorage.getItem("tigerbeetle_clusters");
  if (saved) {
    try {
      clusters.value = JSON.parse(saved);
    } catch (e) {
      console.error("Failed to load clusters:", e);
    }
  }

  // Load current cluster
  const current = localStorage.getItem("tigerbeetle_current_cluster");
  if (current) {
    try {
      currentCluster.value = JSON.parse(current);
    } catch (e) {
      console.error("Failed to load current cluster:", e);
    }
  }

  // Try to get current connection config
  try {
    const config = await window.tigerBeetleApi.getConnectionConfig();
    if (config) {
      const existing = clusters.value.find(
        (c) => c.cluster_id === config.cluster_id
      );
      if (existing) {
        currentCluster.value = existing;
      } else {
        // Add current connection as a cluster
        const newCluster: Cluster = {
          id: `cluster_${Date.now()}`,
          name: "Current Connection",
          cluster_id: config.cluster_id,
          replica_addresses: config.replica_addresses,
          lastConnected: Date.now(),
        };
        clusters.value.push(newCluster);
        currentCluster.value = newCluster;
        saveToLocalStorage();
      }
    }
  } catch (e) {
    console.error("Failed to get connection config:", e);
  }
});
</script>
