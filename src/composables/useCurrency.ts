import type { CurrencyConfig, LedgerConfig } from "@/types/tigerbeetle";
import { DEFAULT_CURRENCY } from "@/types/tigerbeetle";
import { computed, ref } from "vue";


const globalCurrency = ref<CurrencyConfig>({ ...DEFAULT_CURRENCY });
const ledgerConfigs = ref<LedgerConfig[]>([]);
const isLoaded = ref(false);

export function useCurrency() {
  
  function loadCurrency() {
    if (isLoaded.value) return;

    try {
      
      const savedGlobal = localStorage.getItem("tigerbeetle_global_currency");
      if (savedGlobal) {
        globalCurrency.value = JSON.parse(savedGlobal);
      }

      
      const savedLedgers = localStorage.getItem("tigerbeetle_ledger_configs");
      if (savedLedgers) {
        ledgerConfigs.value = JSON.parse(savedLedgers);
      }

      isLoaded.value = true;
    } catch (error) {
    }
  }

  
  function getCurrencyForLedger(ledgerId: number | string): CurrencyConfig {
    loadCurrency();

    const ledgerIdNum =
      typeof ledgerId === "string" ? parseInt(ledgerId) : ledgerId;
    const ledger = ledgerConfigs.value.find((l) => l.id === ledgerIdNum);

    return ledger?.currency || globalCurrency.value;
  }

  
  function setGlobalCurrency(currency: CurrencyConfig) {
    globalCurrency.value = { ...currency };
    localStorage.setItem(
      "tigerbeetle_global_currency",
      JSON.stringify(currency)
    );
  }

  
  function updateLedgerConfigs(ledgers: LedgerConfig[]) {
    ledgerConfigs.value = ledgers;
  }

  
  function getAvailableCurrencies(): CurrencyConfig[] {
    loadCurrency();

    const currencies = new Map<string, CurrencyConfig>();

    
    currencies.set(globalCurrency.value.code, globalCurrency.value);

    
    ledgerConfigs.value.forEach((ledger) => {
      if (ledger.currency) {
        currencies.set(ledger.currency.code, ledger.currency);
      }
    });

    return Array.from(currencies.values());
  }

  
  function getLedgerName(ledgerId: number | string): string {
    loadCurrency();

    const ledgerIdNum =
      typeof ledgerId === "string" ? parseInt(ledgerId) : ledgerId;
    const ledger = ledgerConfigs.value.find((l) => l.id === ledgerIdNum);

    return ledger?.name || `Ledger ${ledgerId}`;
  }

  
  function getAccountCodeName(ledgerId: number | string, code: number): string {
    loadCurrency();

    const ledgerIdNum =
      typeof ledgerId === "string" ? parseInt(ledgerId) : ledgerId;
    const ledger = ledgerConfigs.value.find((l) => l.id === ledgerIdNum);
    const codeDefinition = ledger?.accountCodes?.find((c) => c.code === code);

    return codeDefinition?.name || `Code ${code}`;
  }

  
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
    
    globalCurrency: computed(() => globalCurrency.value),
    ledgerConfigs: computed(() => ledgerConfigs.value),

    
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
