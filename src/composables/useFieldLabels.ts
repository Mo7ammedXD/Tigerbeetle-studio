import { ref } from "vue";

const STORAGE_KEY = "tigerbeetle_field_labels";

export interface FieldLabels {
  user_data_128: string;
  user_data_64: string;
  user_data_32: string;
}

const DEFAULTS: FieldLabels = {
  user_data_128: "User Data 128",
  user_data_64: "User Data 64",
  user_data_32: "User Data 32",
};

const labels = ref<FieldLabels>({ ...DEFAULTS });

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) labels.value = { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    labels.value = { ...DEFAULTS };
  }
}

load();

/**
 * TigerBeetle's user_data fields are the documented link to an external system
 * - an order id, a customer reference, an idempotency key. Naming them locally
 * is what turns "user_data_128 = 4417" into "Order = 4417".
 */
export function useFieldLabels() {
  function setLabel(field: keyof FieldLabels, value: string) {
    labels.value = { ...labels.value, [field]: value || DEFAULTS[field] };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(labels.value));
    } catch {
      /* storage unavailable; labels stay in memory for this session */
    }
  }

  function resetLabels() {
    labels.value = { ...DEFAULTS };
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* nothing to clean up */
    }
  }

  return { labels, setLabel, resetLabels, DEFAULTS };
}
