<template>
  <v-app>
    <v-app-bar color="surface" elevation="2" prominent>
      <template #prepend>
        <img
          src="/sidebar-logo.png"
          alt="TigerBeetle Logo"
          class="ml-2 app-logo rounded-lg"
          style="height: 50px; width: auto; object-fit: contain"
        />
      </template>
      <template #append>
        <v-chip
          :color="isConnected ? 'success' : 'error'"
          :prepend-icon="isConnected ? 'mdi-check-circle' : 'mdi-close-circle'"
          variant="flat"
          class="mr-2"
        >
          {{ isConnected ? "Connected" : "Disconnected" }}
        </v-chip>

        <v-btn
          icon="mdi-keyboard"
          variant="text"
          @click="showShortcuts"
          class="mr-2"
        />

        <v-btn
          :icon="darkMode ? 'mdi-weather-sunny' : 'mdi-weather-night'"
          variant="text"
          @click="toggleDarkMode"
          class="mr-2"
        />

        <v-btn
          color="primary"
          variant="flat"
          @click="showConnectionModal = true"
          prepend-icon="mdi-connection"
        >
          {{ isConnected ? "Reconnect" : "Connect" }}
        </v-btn>
      </template>
    </v-app-bar>

    <v-navigation-drawer permanent width="280">
      <v-list density="compact" nav>
        <v-list-subheader>OVERVIEW</v-list-subheader>
        <v-list-item
          prepend-icon="mdi-view-dashboard"
          title="Dashboard"
          value="dashboard"
          :active="activeView === 'dashboard'"
          @click="activeView = 'dashboard'"
          color="primary"
        />

        <v-divider class="my-2" />
        <v-list-subheader>DATA</v-list-subheader>
        <v-list-item
          prepend-icon="mdi-account-multiple"
          title="Accounts"
          value="accounts"
          :active="activeView === 'accounts'"
          @click="activeView = 'accounts'"
          color="primary"
        />
        <v-list-item
          prepend-icon="mdi-bank-transfer"
          title="Transfers"
          value="transfers"
          :active="activeView === 'transfers'"
          @click="activeView = 'transfers'"
          color="primary"
        />

        <v-divider class="my-2" />
        <v-list-subheader>TOOLS</v-list-subheader>
     

        <v-list-item
          prepend-icon="mdi-database-export"
          title="Backup & Export"
          value="backup"
          :active="activeView === 'backup'"
          @click="activeView = 'backup'"
          color="primary"
        />
        <v-list-item
          prepend-icon="mdi-text-search"
          title="Advanced Search"
          value="search"
          :active="activeView === 'search'"
          @click="activeView = 'search'"
          color="primary"
        />

        <v-divider class="my-2" />
        <v-list-subheader>ADVANCED</v-list-subheader>
        <v-list-item
          prepend-icon="mdi-file-document-multiple"
          title="Transfer Templates"
          value="templates"
          :active="activeView === 'templates'"
          @click="activeView = 'templates'"
          color="primary"
        />

        <v-list-item
          prepend-icon="mdi-server-network"
          title="Cluster Manager"
          value="clusters"
          :active="activeView === 'clusters'"
          @click="activeView = 'clusters'"
          color="primary"
        />
        <v-list-item
          prepend-icon="mdi-book-cog"
          title="Ledger Config"
          value="ledgerconfig"
          :active="activeView === 'ledgerconfig'"
          @click="activeView = 'ledgerconfig'"
          color="primary"
        />

        <v-divider class="my-2" />
        <v-list-subheader>VISUALIZATION</v-list-subheader>
        <v-list-item
          prepend-icon="mdi-graph"
          title="Flow Visualizer"
          value="flow"
          :active="activeView === 'flow'"
          @click="activeView = 'flow'"
          color="primary"
        />
      </v-list>
    </v-navigation-drawer>

    <v-main>
      <v-container fluid class="pa-6">
        <Dashboard
          v-if="activeView === 'dashboard'"
          :is-connected="isConnected"
        />
        <AccountsView
          v-else-if="activeView === 'accounts'"
          :is-connected="isConnected"
          @refresh="checkConnection"
        />
        <TransfersView
          v-else-if="activeView === 'transfers'"
          :is-connected="isConnected"
          @refresh="checkConnection"
        />
      
        <BackupExport
          v-else-if="activeView === 'backup'"
          :is-connected="isConnected"
        />
        <AdvancedSearch
          v-else-if="activeView === 'search'"
          :is-connected="isConnected"
        />
        <TransferTemplates
          v-else-if="activeView === 'templates'"
          :is-connected="isConnected"
          @refresh="checkConnection"
        />

        <ClusterManager
          v-else-if="activeView === 'clusters'"
          :is-connected="isConnected"
          @clusterChanged="checkConnection"
        />
        <LedgerConfig
          v-else-if="activeView === 'ledgerconfig'"
          :is-connected="isConnected"
        />

        <FlowVisualizer
          v-else-if="activeView === 'flow'"
          :is-connected="isConnected"
        />
      </v-container>
    </v-main>

    <ConnectionModal
      v-model="showConnectionModal"
      @connected="handleConnected"
    />

    <KeyboardShortcutsDialog ref="shortcutsDialog" />
  </v-app>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { useTheme } from "vuetify";
import AccountsView from "./components/AccountsView.vue";
import AdvancedSearch from "./components/AdvancedSearch.vue";
import BackupExport from "./components/BackupExport.vue";

import ClusterManager from "./components/ClusterManager.vue";
import ConnectionModal from "./components/ConnectionModal.vue";
import Dashboard from "./components/Dashboard.vue";
import FlowVisualizer from "./components/FlowVisualizer.vue";
import KeyboardShortcutsDialog from "./components/KeyboardShortcutsDialog.vue";
import LedgerConfig from "./components/LedgerConfig.vue";


import TransfersView from "./components/TransfersView.vue";
import TransferTemplates from "./components/TransferTemplates.vue";
import { useKeyboardShortcuts } from "./composables/useKeyboardShortcuts";

type ViewType =
  | "dashboard"
  | "accounts"
  | "transfers"
  | "query"
  | "history"
  | "bulk"
  | "backup"
  | "search"
  | "templates"
  | "pending"
  | "clusters"
  | "ledgerconfig"
  | "visualization"
  | "flow";
const activeView = ref<ViewType>("dashboard");
const isConnected = ref(false);
const showConnectionModal = ref(false);
const connectionHealth = ref<"healthy" | "checking" | "disconnected">(
  "disconnected"
);
const darkMode = ref(false);
const shortcutsDialog = ref<InstanceType<typeof KeyboardShortcutsDialog>>();
const theme = useTheme();
let healthCheckInterval: number | null = null;

const savedDarkMode = localStorage.getItem("tigerbeetle_dark_mode");
if (savedDarkMode) {
  darkMode.value = savedDarkMode === "true";
  theme.global.name.value = darkMode.value ? "dark" : "light";
}

function toggleDarkMode() {
  darkMode.value = !darkMode.value;
  theme.global.name.value = darkMode.value ? "dark" : "light";
  localStorage.setItem("tigerbeetle_dark_mode", darkMode.value.toString());
}

function showShortcuts() {
  shortcutsDialog.value?.show();
}

useKeyboardShortcuts([
  {
    key: "1",
    ctrl: true,
    description: "Go to Dashboard",
    action: () => (activeView.value = "dashboard"),
  },
  {
    key: "2",
    ctrl: true,
    description: "Go to Accounts",
    action: () => (activeView.value = "accounts"),
  },
  {
    key: "3",
    ctrl: true,
    description: "Go to Transfers",
    action: () => (activeView.value = "transfers"),
  },
  {
    key: "r",
    ctrl: true,
    description: "Refresh Data",
    action: checkConnection,
  },
  {
    key: "f",
    ctrl: true,
    description: "Go to Search",
    action: () => (activeView.value = "search"),
  },
  {
    key: "e",
    ctrl: true,
    description: "Go to Export/Backup",
    action: () => (activeView.value = "backup"),
  },
  {
    key: "d",
    ctrl: true,
    description: "Toggle Dark Mode",
    action: toggleDarkMode,
  },
  {
    key: "k",
    ctrl: true,
    description: "Show Keyboard Shortcuts",
    action: showShortcuts,
  },
  {
    key: "/",
    description: "Show Keyboard Shortcuts",
    action: showShortcuts,
  },
]);

async function checkConnection() {
  try {
    connectionHealth.value = "checking";
    const result = await window.tigerBeetleApi.isConnected();
    isConnected.value = result.connected;
    connectionHealth.value = result.connected ? "healthy" : "disconnected";
  } catch (error) {
    isConnected.value = false;
    connectionHealth.value = "disconnected";
  }
}

function startHealthCheck() {
  healthCheckInterval = window.setInterval(() => {
    checkConnection();
  }, 10000);
}

function stopHealthCheck() {
  if (healthCheckInterval !== null) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
}

function handleConnected() {
  showConnectionModal.value = false;
  checkConnection();
}

onMounted(async () => {
  await checkConnection();
  startHealthCheck();

  if (!isConnected.value) {
    const config = await window.tigerBeetleApi.getConnectionConfig();
    if (!config) {
      showConnectionModal.value = true;
    }
  }
});

onUnmounted(() => {
  stopHealthCheck();
});
</script>
