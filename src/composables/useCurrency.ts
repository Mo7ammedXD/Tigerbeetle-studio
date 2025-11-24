import type { CurrencyConfig, LedgerConfig } from "@/types/tigerbeetle";
import { DEFAULT_CURRENCY } from "@/types/tigerbeetle";
import { computed, ref } from "vue";

// Global reactive state
const globalCurrency = ref<CurrencyConfig>({ ...DEFAULT_CURRENCY });
const ledgerConfigs = ref<LedgerConfig[]>([]);
const isLoaded = ref(false);

export function useCurrency() {
  // Load currency data from localStorage
  function loadCurrency() {
    if (isLoaded.value) return;

    try {
      // Load global currency
      const savedGlobal = localStorage.getItem("tigerbeetle_global_currency");
      if (savedGlobal) {
        globalCurrency.value = JSON.parse(savedGlobal);
      }

      // Load ledger configurations
      const savedLedgers = localStorage.getItem("tigerbeetle_ledger_configs");
      if (savedLedgers) {
        ledgerConfigs.value = JSON.parse(savedLedgers);
      }

      isLoaded.value = true;
    } catch (error) {
    }
  }

  // Get currency for a specific ledger ID
  function getCurrencyForLedger(ledgerId: number | string): CurrencyConfig {
    loadCurrency();

    const ledgerIdNum =
      typeof ledgerId === "string" ? parseInt(ledgerId) : ledgerId;
    const ledger = ledgerConfigs.value.find((l) => l.id === ledgerIdNum);

    return ledger?.currency || globalCurrency.value;
  }

  // Set global currency
  function setGlobalCurrency(currency: CurrencyConfig) {
    globalCurrency.value = { ...currency };
    localStorage.setItem(
      "tigerbeetle_global_currency",
      JSON.stringify(currency)
    );
  }

  // Update ledger configurations (called when ledgers change)
  function updateLedgerConfigs(ledgers: LedgerConfig[]) {
    ledgerConfigs.value = ledgers;
  }

  // Get all available currencies from ledger configs
  function getAvailableCurrencies(): CurrencyConfig[] {
    loadCurrency();

    const currencies = new Map<string, CurrencyConfig>();

    // Add global currency
    currencies.set(globalCurrency.value.code, globalCurrency.value);

    // Add currencies from all ledgers
    ledgerConfigs.value.forEach((ledger) => {
      if (ledger.currency) {
        currencies.set(ledger.currency.code, ledger.currency);
      }
    });

    return Array.from(currencies.values());
  }

  // Get ledger name by ID
  function getLedgerName(ledgerId: number | string): string {
    loadCurrency();

    const ledgerIdNum =
      typeof ledgerId === "string" ? parseInt(ledgerId) : ledgerId;
    const ledger = ledgerConfigs.value.find((l) => l.id === ledgerIdNum);

    return ledger?.name || `Ledger ${ledgerId}`;
  }

  // Get account code name
  function getAccountCodeName(ledgerId: number | string, code: number): string {
    loadCurrency();

    const ledgerIdNum =
      typeof ledgerId === "string" ? parseInt(ledgerId) : ledgerId;
    const ledger = ledgerConfigs.value.find((l) => l.id === ledgerIdNum);
    const codeDefinition = ledger?.accountCodes?.find((c) => c.code === code);

    return codeDefinition?.name || `Code ${code}`;
  }

  // Get transfer code name
  function getTransferCodeName(
    ledgerId: number | string,
    code: number
  ): string {
    loadCurrency();

    const ledgerIdNum =
      typeof ledgerId === "string" ? parseInt(ledgerId) : ledgerId;
    const ledger = ledgerConfigs.value.find((l) => l.id === ledgerIdNum);
    const codeDefinition = ledger?.transferCodes?.find((c) => c.code === code);

    return codeDefinition?.name || `Code ${code}`;
  }

  return {
    // Reactive state
    globalCurrency: computed(() => globalCurrency.value),
    ledgerConfigs: computed(() => ledgerConfigs.value),

    // Methods
    loadCurrency,
    getCurrencyForLedger,
    setGlobalCurrency,
    updateLedgerConfigs,
    getAvailableCurrencies,
    getLedgerName,
    getAccountCodeName,
    getTransferCodeName,
  };
}
