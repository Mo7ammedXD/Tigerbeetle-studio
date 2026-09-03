import { computed, ref } from "vue";

export type Environment = "Development" | "Staging" | "Production";

const CURRENT_CLUSTER_KEY = "tigerbeetle_current_cluster";

const currentClusterName = ref<string>("");
const currentEnvironment = ref<Environment>("Development");

/**
 * Reads the cluster the app is currently pointed at. Clusters are stored by
 * ClusterManager under `tigerbeetle_current_cluster`; a cluster saved before
 * the environment field existed is treated as Production, on the principle
 * that an unlabelled cluster deserves the strictest handling.
 */
export function refreshEnvironment() {
  try {
    const raw = localStorage.getItem(CURRENT_CLUSTER_KEY);
    if (!raw) {
      currentClusterName.value = "";
      currentEnvironment.value = "Development";
      return;
    }
    const cluster = JSON.parse(raw);
    currentClusterName.value = cluster?.name || "";
    currentEnvironment.value = (cluster?.environment as Environment) || "Production";
  } catch {
    currentClusterName.value = "";
    currentEnvironment.value = "Production";
  }
}

refreshEnvironment();

export function useEnvironment() {
  const isProduction = computed(
    () => currentEnvironment.value === "Production"
  );

  const environmentColor = computed(() => {
    switch (currentEnvironment.value) {
      case "Production":
        return "error";
      case "Staging":
        return "warning";
      default:
        return "success";
    }
  });

  /**
   * Gate a write against the current environment. On Production the caller
   * must type the cluster name (or "PRODUCTION" when it has none) to proceed.
   */
  function confirmWrite(description: string): boolean {
    if (!isProduction.value) return true;

    const expected = currentClusterName.value || "PRODUCTION";
    const answer = window.prompt(
      `You are connected to PRODUCTION${
        currentClusterName.value ? ` (${currentClusterName.value})` : ""
      }.\n\n${description}\n\nType "${expected}" to confirm:`
    );

    return answer !== null && answer.trim() === expected;
  }

  return {
    currentClusterName,
    currentEnvironment,
    isProduction,
    environmentColor,
    confirmWrite,
    refreshEnvironment,
  };
}
