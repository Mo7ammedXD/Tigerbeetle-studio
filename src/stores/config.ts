import type { CurrencyConfig, LedgerConfig } from "@/types/tigerbeetle";
import { DEFAULT_CURRENCY } from "@/types/tigerbeetle";
import { ref } from "vue";

// Global currency configuration
export const globalCurrency = ref<CurrencyConfig>(DEFAULT_CURRENCY);

// Ledger-specific configurations
export const ledgerConfigs = ref<Map<number, LedgerConfig>>(new Map());

export function setGlobalCurrency(currency: CurrencyConfig) {
  globalCurrency.value = currency;
  // Save to localStorage
  localStorage.setItem("tigerbeetle_currency", JSON.stringify(currency));
}

export function setLedgerConfig(ledgerId: number, config: LedgerConfig) {
  ledgerConfigs.value.set(ledgerId, config);
  // Save to localStorage
  const configs = Array.from(ledgerConfigs.value.entries());
  localStorage.setItem("tigerbeetle_ledgers", JSON.stringify(configs));
}

export function getLedgerConfig(ledgerId: number): LedgerConfig | null {
  return ledgerConfigs.value.get(ledgerId) || null;
}

export function getCurrencyForLedger(ledgerId: number): CurrencyConfig {
  const ledgerConfig = getLedgerConfig(ledgerId);
  return ledgerConfig?.currency || globalCurrency.value;
}

// Load from localStorage on init
export function loadConfig() {
  try {
    const savedCurrency = localStorage.getItem("tigerbeetle_currency");
    if (savedCurrency) {
      globalCurrency.value = JSON.parse(savedCurrency);
    }

    const savedLedgers = localStorage.getItem("tigerbeetle_ledgers");
    if (savedLedgers) {
      const configs = JSON.parse(savedLedgers) as [number, LedgerConfig][];
      ledgerConfigs.value = new Map(configs);
    }
  } catch (error) {
  }
}

// Initialize on module load
loadConfig();
