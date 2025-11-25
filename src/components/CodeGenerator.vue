<template>
  <div>
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between pa-4">
        <div class="d-flex align-center">
          <v-icon icon="mdi-code-braces" class="mr-2" color="primary" />
          <span class="text-h5">Code Generator</span>
        </div>
      </v-card-title>

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
        
        <v-row class="mb-4">
          <v-col cols="12" md="4">
            <v-select
              v-model="language"
              :items="languages"
              label="Language"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-language-javascript"
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-select
              v-model="operation"
              :items="operations"
              label="Operation"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-function"
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-select
              v-model="style"
              :items="styles"
              label="Code Style"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-palette"
            />
          </v-col>
        </v-row>

        
        <v-card variant="outlined" class="mb-4">
          <v-card-title>Parameters</v-card-title>
          <v-card-text>
            <v-row v-if="operation === 'createAccount'">
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="params.accountId"
                  label="Account ID"
                  variant="outlined"
                  density="comfortable"
                  hint="Leave empty for auto-generated"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="params.ledger"
                  label="Ledger"
                  type="number"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="params.code"
                  label="Code"
                  type="number"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="params.flags"
                  label="Flags"
                  variant="outlined"
                  density="comfortable"
                  hint="e.g., linked, debits_must_not_exceed_credits"
                />
              </v-col>
            </v-row>

            <v-row v-else-if="operation === 'createTransfer'">
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="params.debitAccountId"
                  label="Debit Account ID"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="params.creditAccountId"
                  label="Credit Account ID"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="params.amount"
                  label="Amount"
                  type="number"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="params.ledger"
                  label="Ledger"
                  type="number"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="params.code"
                  label="Code"
                  type="number"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-checkbox
                  v-model="params.pending"
                  label="Pending Transfer"
                  density="compact"
                  hide-details
                />
              </v-col>
            </v-row>

            <v-row v-else-if="operation === 'lookupAccounts'">
              <v-col cols="12">
                <v-textarea
                  v-model="params.accountIds"
                  label="Account IDs (one per line)"
                  variant="outlined"
                  density="comfortable"
                  rows="3"
                />
              </v-col>
            </v-row>

            <v-row v-else-if="operation === 'lookupTransfers'">
              <v-col cols="12">
                <v-textarea
                  v-model="params.transferIds"
                  label="Transfer IDs (one per line)"
                  variant="outlined"
                  density="comfortable"
                  rows="3"
                />
              </v-col>
            </v-row>

            <v-row v-else-if="operation === 'connect'">
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="params.clusterId"
                  label="Cluster ID"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-textarea
                  v-model="params.replicaAddresses"
                  label="Replica Addresses (one per line)"
                  variant="outlined"
                  density="comfortable"
                  rows="2"
                />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        
        <v-card variant="outlined">
          <v-card-title class="d-flex align-center justify-space-between">
            <span>Generated Code</span>
            <div class="d-flex gap-2">
              <v-btn
                size="small"
                prepend-icon="mdi-refresh"
                @click="generateCode"
              >
                Regenerate
              </v-btn>
              <v-btn
                size="small"
                prepend-icon="mdi-content-copy"
                @click="copyCode"
              >
                Copy
              </v-btn>
              <v-btn
                size="small"
                prepend-icon="mdi-download"
                @click="downloadCode"
              >
                Download
              </v-btn>
            </div>
          </v-card-title>
          <v-card-text>
            <pre class="code-block"><code>{{ generatedCode }}</code></pre>
          </v-card-text>
        </v-card>

        
        <v-divider class="my-6" />
        <div class="text-h6 mb-4">Quick Templates</div>
        <v-row>
          <v-col
            v-for="template in templates"
            :key="template.name"
            cols="12"
            md="4"
          >
            <v-card variant="outlined" hover @click="loadTemplate(template)">
              <v-card-title class="d-flex align-center">
                <v-icon :icon="template.icon" class="mr-2" />
                {{ template.name }}
              </v-card-title>
              <v-card-subtitle>{{ template.description }}</v-card-subtitle>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";

const language = ref("typescript");
const operation = ref("createAccount");
const style = ref("async-await");
const success = ref<string | null>(null);

const params = ref({
  accountId: "",
  ledger: "1",
  code: "1",
  flags: "",
  debitAccountId: "",
  creditAccountId: "",
  amount: "1000",
  pending: false,
  accountIds: "",
  transferIds: "",
  clusterId: "0",
  replicaAddresses: "3000\n3001\n3002",
});

const generatedCode = ref("");

const languages = [
  { title: "TypeScript", value: "typescript" },
  { title: "JavaScript", value: "javascript" },
  { title: "Python", value: "python" },
  { title: "Go", value: "go" },
  { title: "Rust", value: "rust" },
  { title: "Java", value: "java" },
];

const operations = [
  { title: "Connect to Cluster", value: "connect" },
  { title: "Create Account", value: "createAccount" },
  { title: "Create Transfer", value: "createTransfer" },
  { title: "Lookup Accounts", value: "lookupAccounts" },
  { title: "Lookup Transfers", value: "lookupTransfers" },
  { title: "Batch Operations", value: "batch" },
];

const styles = [
  { title: "Async/Await", value: "async-await" },
  { title: "Promises", value: "promises" },
  { title: "Callbacks", value: "callbacks" },
];

const templates = [
  {
    name: "Simple Payment",
    description: "Basic transfer between two accounts",
    icon: "mdi-cash",
    operation: "createTransfer",
    params: {
      debitAccountId: "1",
      creditAccountId: "2",
      amount: "1000",
      ledger: "1",
      code: "1",
    },
  },
  {
    name: "Two-Phase Transfer",
    description: "Pending transfer with post/void",
    icon: "mdi-clock-alert",
    operation: "createTransfer",
    params: {
      debitAccountId: "1",
      creditAccountId: "2",
      amount: "1000",
      ledger: "1",
      code: "1",
      pending: true,
    },
  },
  {
    name: "Account Setup",
    description: "Create account with flags",
    icon: "mdi-account-plus",
    operation: "createAccount",
    params: {
      ledger: "1",
      code: "1",
      flags: "debits_must_not_exceed_credits",
    },
  },
];

watch(
  [language, operation, style, params],
  () => {
    generateCode();
  },
  { deep: true }
);

generateCode();

function generateCode() {
  switch (language.value) {
    case "typescript":
      generatedCode.value = generateTypeScript();
      break;
    case "javascript":
      generatedCode.value = generateJavaScript();
      break;
    case "python":
      generatedCode.value = generatePython();
      break;
    case "go":
      generatedCode.value = generateGo();
      break;
    case "rust":
      generatedCode.value = generateRust();
      break;
    case "java":
      generatedCode.value = generateJava();
      break;
  }
}

function generateTypeScript(): string {
  switch (operation.value) {
    case "connect":
      return `import { createClient } from 'tigerbeetle-node';

const client = createClient({
  cluster_id: ${params.value.clusterId},
  replica_addresses: [${params.value.replicaAddresses
    .split("\n")
    .map((a) => `'${a.trim()}'`)
    .join(", ")}]
});


console.log('Connected to TigerBeetle');`;

    case "createAccount":
      return `import { createClient, Account } from 'tigerbeetle-node';

const client = createClient({ });

const account: Account = {
  id: ${params.value.accountId || "generateId()"},
  ledger: ${params.value.ledger},
  code: ${params.value.code},
  flags: ${params.value.flags ? `AccountFlags.${params.value.flags}` : "0"},
  debits_pending: 0n,
  debits_posted: 0n,
  credits_pending: 0n,
  credits_posted: 0n,
  user_data_128: 0n,
  user_data_64: 0n,
  user_data_32: 0,
  reserved: 0,
  timestamp: 0n
};

const result = await client.createAccounts([account]);
if (result.length === 0) {
  console.log('Account created successfully');
} else {
  console.error('Failed to create account:', result);
}`;

    case "createTransfer":
      return `import { createClient, Transfer } from 'tigerbeetle-node';

const client = createClient({ });

const transfer: Transfer = {
  id: generateId(),
  debit_account_id: ${params.value.debitAccountId},
  credit_account_id: ${params.value.creditAccountId},
  amount: ${params.value.amount}n,
  pending_id: 0n,
  user_data_128: 0n,
  user_data_64: 0n,
  user_data_32: 0,
  timeout: 0,
  ledger: ${params.value.ledger},
  code: ${params.value.code},
  flags: ${params.value.pending ? "TransferFlags.pending" : "0"},
  timestamp: 0n
};

const result = await client.createTransfers([transfer]);
if (result.length === 0) {
  console.log('Transfer created successfully');
} else {
  console.error('Failed to create transfer:', result);
}`;

    case "lookupAccounts":
      const accountIds = params.value.accountIds
        .split("\n")
        .filter((id) => id.trim());
      return `import { createClient } from 'tigerbeetle-node';

const client = createClient({ });

const accountIds = [${accountIds.map((id) => id.trim()).join(", ")}];
const accounts = await client.lookupAccounts(accountIds);

console.log(\`Found \${accounts.length} accounts\`);
accounts.forEach(account => {
  console.log(\`Account \${account.id}: Balance = \${account.credits_posted - account.debits_posted}\`);
});`;

    case "lookupTransfers":
      const transferIds = params.value.transferIds
        .split("\n")
        .filter((id) => id.trim());
      return `import { createClient } from 'tigerbeetle-node';

const client = createClient({ });

const transferIds = [${transferIds.map((id) => id.trim()).join(", ")}];
const transfers = await client.lookupTransfers(transferIds);

console.log(\`Found \${transfers.length} transfers\`);
transfers.forEach(transfer => {
  console.log(\`Transfer \${transfer.id}: \${transfer.amount}\`);
});`;

    case "batch":
      return `import { createClient, Account, Transfer } from 'tigerbeetle-node';

const client = createClient({ });


const accounts: Account[] = [
  { id: 1n, ledger: 1, code: 1, },
  { id: 2n, ledger: 1, code: 1, }
];

const accountResults = await client.createAccounts(accounts);
console.log(\`Created \${accounts.length - accountResults.length} accounts\`);


const transfers: Transfer[] = [
  { id: 1n, debit_account_id: 1n, credit_account_id: 2n, amount: 1000n, },
  { id: 2n, debit_account_id: 2n, credit_account_id: 1n, amount: 500n, }
];

const transferResults = await client.createTransfers(transfers);
console.log(\`Created \${transfers.length - transferResults.length} transfers\`);`;

    default:
      return "
  }
}

function generateJavaScript(): string {
  return generateTypeScript()
    .replace(/: \w+/g, "")
    .replace(/import.*from/g, "const { ... } = require");
}

function generatePython(): string {
  switch (operation.value) {
    case "createAccount":
      return `from tigerbeetle import Client, Account

client = Client(cluster_id=0, replica_addresses=['3000', '3001', '3002'])

account = Account(
    id=${params.value.accountId || "generate_id()"},
    ledger=${params.value.ledger},
    code=${params.value.code},
    flags=${params.value.flags ? `AccountFlags.${params.value.flags}` : "0"}
)

result = client.create_accounts([account])
if len(result) == 0:
    print('Account created successfully')
else:
    print(f'Failed to create account: {result}')`;

    case "createTransfer":
      return `from tigerbeetle import Client, Transfer

client = Client(cluster_id=0, replica_addresses=['3000', '3001', '3002'])

transfer = Transfer(
    id=generate_id(),
    debit_account_id=${params.value.debitAccountId},
    credit_account_id=${params.value.creditAccountId},
    amount=${params.value.amount},
    ledger=${params.value.ledger},
    code=${params.value.code},
    flags=${params.value.pending ? "TransferFlags.pending" : "0"}
)

result = client.create_transfers([transfer])
if len(result) == 0:
    print('Transfer created successfully')
else:
    print(f'Failed to create transfer: {result}')`;

    default:
      return "# Select an operation to generate code";
  }
}

function generateGo(): string {
  switch (operation.value) {
    case "createAccount":
      return `package main

import (
    "fmt"
    "github.com/tigerbeetle/tigerbeetle-go"
)

func main() {
    client, err := tigerbeetle.NewClient(tigerbeetle.ClientConfig{
        ClusterID: ${params.value.clusterId},
        Addresses: []string{${params.value.replicaAddresses
          .split("\n")
          .map((a) => `"${a.trim()}"`)
          .join(", ")}},
    })
    if err != nil {
        panic(err)
    }
    defer client.Close()

    account := tigerbeetle.Account{
        ID:     ${params.value.accountId || "generateID()"},
        Ledger: ${params.value.ledger},
        Code:   ${params.value.code},
    }

    results, err := client.CreateAccounts([]tigerbeetle.Account{account})
    if err != nil {
        panic(err)
    }

    if len(results) == 0 {
        fmt.Println("Account created successfully")
    } else {
        fmt.Printf("Failed to create account: %v\\n", results)
    }
}`;

    default:
      return "
  }
}

function generateRust(): string {
  return `
}

function generateJava(): string {
  return `
}

function copyCode() {
  navigator.clipboard.writeText(generatedCode.value);
  success.value = "Code copied to clipboard!";
}

function downloadCode() {
  const extension =
    language.value === "typescript"
      ? "ts"
      : language.value === "python"
      ? "py"
      : "js";
  const blob = new Blob([generatedCode.value], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = `tigerbeetle-${operation.value}.${extension}`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
  success.value = "Code downloaded!";
}

function loadTemplate(template: any) {
  operation.value = template.operation;
  Object.assign(params.value, template.params);
  generateCode();
}
</script>

<style scoped>
.code-block {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 16px;
  border-radius: 4px;
  overflow-x: auto;
  font-family: "Courier New", monospace;
  font-size: 14px;
  line-height: 1.5;
  max-height: 600px;
}
</style>
