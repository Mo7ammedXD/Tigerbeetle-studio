<template>
  <v-dialog v-model="dialog" max-width="700">
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <v-icon icon="mdi-keyboard" class="mr-2" />
          <span>Keyboard Shortcuts</span>
        </div>
        <v-btn icon="mdi-close" variant="text" @click="dialog = false" />
      </v-card-title>

      <v-card-text>
        <div class="text-subtitle-1 mb-3">Navigation</div>
        <v-list density="compact" class="mb-4">
          <v-list-item
            v-for="shortcut in navigationShortcuts"
            :key="shortcut.key"
          >
            <v-list-item-title>{{ shortcut.description }}</v-list-item-title>
            <template #append>
              <v-chip size="small" variant="outlined">
                {{ formatShortcut(shortcut) }}
              </v-chip>
            </template>
          </v-list-item>
        </v-list>

        <div class="text-subtitle-1 mb-3">Actions</div>
        <v-list density="compact" class="mb-4">
          <v-list-item v-for="shortcut in actionShortcuts" :key="shortcut.key">
            <v-list-item-title>{{ shortcut.description }}</v-list-item-title>
            <template #append>
              <v-chip size="small" variant="outlined">
                {{ formatShortcut(shortcut) }}
              </v-chip>
            </template>
          </v-list-item>
        </v-list>

        <div class="text-subtitle-1 mb-3">Views</div>
        <v-list density="compact">
          <v-list-item v-for="shortcut in viewShortcuts" :key="shortcut.key">
            <v-list-item-title>{{ shortcut.description }}</v-list-item-title>
            <template #append>
              <v-chip size="small" variant="outlined">
                {{ formatShortcut(shortcut) }}
              </v-chip>
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn @click="dialog = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { KeyboardShortcut } from "@/composables/useKeyboardShortcuts";
import { ref } from "vue";

const dialog = ref(false);

const navigationShortcuts: KeyboardShortcut[] = [
  { key: "1", ctrl: true, description: "Go to Dashboard", action: () => {} },
  { key: "2", ctrl: true, description: "Go to Accounts", action: () => {} },
  { key: "3", ctrl: true, description: "Go to Transfers", action: () => {} },
 
];

const actionShortcuts: KeyboardShortcut[] = [
  { key: "r", ctrl: true, description: "Refresh Data", action: () => {} },
  { key: "f", ctrl: true, description: "Go to Search", action: () => {} },
  {
    key: "e",
    ctrl: true,
    description: "Go to Export/Backup",
    action: () => {},
  },
];

const viewShortcuts: KeyboardShortcut[] = [
  { key: "d", ctrl: true, description: "Toggle Dark Mode", action: () => {} },
  {
    key: "k",
    ctrl: true,
    description: "Show Keyboard Shortcuts",
    action: () => {},
  },
];

function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];

  if (shortcut.ctrl) parts.push("Ctrl");
  if (shortcut.alt) parts.push("Alt");
  if (shortcut.shift) parts.push("Shift");
  if (shortcut.meta) parts.push("Cmd");

  parts.push(shortcut.key.toUpperCase());

  return parts.join(" + ");
}

function show() {
  dialog.value = true;
}

defineExpose({ show });
</script>
