<template>
  <v-dialog :model-value="modelValue" max-width="1000" persistent scrollable>
    <v-card>
      <v-card-title class="d-flex align-center pa-4 bg-surface-variant">
        <v-icon icon="mdi-link-variant" class="mr-2" color="primary" />
        <span class="text-h5">Multi-leg Transaction</span>
      </v-card-title>

      <v-card-text class="pa-6">
        <v-alert
          type="info"
          variant="tonal"
          density="compact"
          class="mb-4 text-caption"
        >
          All legs are submitted as one linked chain — they either all succeed
          or all fail. Use this for transfers that must move together, such as a
          payment and its fee.
        </v-alert>

        <v-alert
          v-if="error"
          type="error"
          variant="tonal"
          class="mb-4"
          closable
          @click:close="error = null"
        >
          {{ error }}
        </v-alert>

        <v-alert v-if="success" type="success" variant="tonal" class="mb-4">
          Created {{ success }} linked transfers.
        </v-alert>

        <v-row dense class="mb-2">
          <v-col cols="12" sm="6" md="3">
            <v-text-field
              v-model.number="ledger"
              label="Ledger *"
              type="number"
              variant="outlined"
              density="compact"
              hide-details
            />
          </v-col>
          <v-col cols="12" sm="6" md="9" class="d-flex align-center">
            <span class="text-caption text-medium-emphasis">
              All legs share this ledger — TigerBeetle cannot link transfers
              across ledgers.
            </span>
          </v-col>
        </v-row>

        <v-table density="compact">
          <thead>
            <tr>
              <th style="width: 40px">#</th>
              <th>Debit account</th>
              <th>Credit account</th>
              <th style="width: 160px">Amount</th>
              <th style="width: 110px">Code</th>
              <th style="width: 60px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(leg, index) in legs" :key="index">
              <td class="text-caption">{{ index + 1 }}</td>
              <td>
                <v-text-field
                  v-model="leg.debit_account_id"
                  variant="outlined"
                  density="compact"
                  hide-details
                  placeholder="Account ID"
                  :error="!!leg.debit_account_id && !isValidTBID(leg.debit_account_id)"
                />
              </td>
              <td>
                <v-text-field
                  v-model="leg.credit_account_id"
                  variant="outlined"
                  density="compact"
                  hide-details
                  placeholder="Account ID"
                  :error="!!leg.credit_account_id && !isValidTBID(leg.credit_account_id)"
                />
              </td>
              <td>
                <v-text-field
                  v-model="leg.amount"
                  variant="outlined"
                  density="compact"
                  hide-details
                  placeholder="0.00"
                />
              </td>
              <td>
                <v-text-field
                  v-model.number="leg.code"
                  type="number"
                  variant="outlined"
                  density="compact"
                  hide-details
                />
              </td>
              <td>
                <v-btn
                  icon="mdi-close"
                  size="x-small"
                  variant="text"
                  :disabled="legs.length <= 1"
                  @click="removeLeg(index)"
                />
              </td>
            </tr>
          </tbody>
        </v-table>

        <v-btn
          variant="text"
          size="small"
          prepend-icon="mdi-plus"
          class="mt-2"
          @click="addLeg"
        >
          Add leg
        </v-btn>

        <v-divider class="my-4" />

        <div class="text-subtitle-2 mb-2">Chain preview</div>
        <div v-if="validLegs.length === 0" class="text-caption text-medium-emphasis">
          Fill in at least one complete leg.
        </div>
        <div v-else class="d-flex flex-wrap gap-2">
          <v-chip
            v-for="(leg, index) in validLegs"
            :key="index"
            size="small"
            :color="index === validLegs.length - 1 ? 'primary' : 'default'"
            variant="tonal"
          >
            <v-icon v-if="index < validLegs.length - 1" start size="x-small">
              mdi-link-variant
            </v-icon>
            Leg {{ index + 1 }}: {{ formatAmount(leg.amount) }}
          </v-chip>
        </div>
        <div class="text-caption text-medium-emphasis mt-2">
          The final leg closes the chain; every earlier leg carries the linked
          flag.
        </div>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" :disabled="loading" @click="close">Cancel</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="loading"
          :disabled="validLegs.length === 0 || !isConnected"
          @click="submit"
        >
          Create {{ validLegs.length }} linked transfer{{
            validLegs.length === 1 ? "" : "s"
          }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { useCurrency } from "@/composables/useCurrency";
import { useEnvironment } from "@/composables/useEnvironment";
import { TransferFlags } from "@/constants/tigerbeetle-flags";
import { formatTBAmount, isValidTBID, parseTBAmount } from "@/utils/bigint";
import { computed, ref } from "vue";

interface Props {
  modelValue: boolean;
  isConnected: boolean;
}

defineProps<Props>();
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  created: [];
}>();

const { getCurrencyForLedger } = useCurrency();
const { confirmWrite } = useEnvironment();

interface Leg {
  debit_account_id: string;
  credit_account_id: string;
  amount: string;
  code: number;
}

function emptyLeg(): Leg {
  return { debit_account_id: "", credit_account_id: "", amount: "", code: 1 };
}

const ledger = ref(1);
const legs = ref<Leg[]>([emptyLeg(), emptyLeg()]);
const loading = ref(false);
const error = ref<string | null>(null);
const success = ref<number | null>(null);

const validLegs = computed(() =>
  legs.value.filter(
    (leg) =>
      leg.debit_account_id &&
      leg.credit_account_id &&
      isValidTBID(leg.debit_account_id) &&
      isValidTBID(leg.credit_account_id) &&
      leg.amount !== ""
  )
);

function formatAmount(value: string): string {
  try {
    return formatTBAmount(
      parseTBAmount(value, getCurrencyForLedger(ledger.value)),
      getCurrencyForLedger(ledger.value)
    );
  } catch {
    return value;
  }
}

function addLeg() {
  legs.value.push(emptyLeg());
}

function removeLeg(index: number) {
  legs.value.splice(index, 1);
}

function close() {
  emit("update:modelValue", false);
}

async function submit() {
  if (validLegs.value.length === 0) return;
  if (
    !confirmWrite(
      `Create ${validLegs.value.length} linked transfers on ledger ${ledger.value}.`
    )
  ) {
    return;
  }

  loading.value = true;
  error.value = null;
  success.value = null;

  try {
    const currency = getCurrencyForLedger(ledger.value);
    const items = validLegs.value.map((leg, index) => ({
      debit_account_id: leg.debit_account_id,
      credit_account_id: leg.credit_account_id,
      amount: parseTBAmount(leg.amount, currency),
      ledger: ledger.value,
      code: leg.code || 1,
      // Every leg but the last carries `linked`, which is what makes the
      // chain atomic.
      flags:
        index < validLegs.value.length - 1 ? TransferFlags.linked : undefined,
    }));

    const result = await window.tigerBeetleApi.createTransfersBatch(items);

    if (result.success && result.data) {
      if (result.data.failures.length > 0) {
        const first = result.data.failures[0];
        error.value = `Chain rejected at leg ${first.index + 1}: ${JSON.stringify(
          first.result
        )}. No transfers were applied.`;
        return;
      }

      success.value = result.data.created;
      setTimeout(() => {
        emit("created");
        close();
        reset();
      }, 1200);
    } else {
      error.value = result.error || "Failed to create linked transfers";
    }
  } catch (err: any) {
    error.value = err?.message || "Failed to create linked transfers";
  } finally {
    loading.value = false;
  }
}

function reset() {
  legs.value = [emptyLeg(), emptyLeg()];
  ledger.value = 1;
  error.value = null;
  success.value = null;
}
</script>
