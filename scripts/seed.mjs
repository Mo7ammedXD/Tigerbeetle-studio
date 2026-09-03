#!/usr/bin/env node
/**
 * Loads a demo dataset into the local cluster (npm run db:up first).
 *
 * The shape is deliberately chosen to exercise the parts of the app that are
 * easy to get wrong:
 *
 *   - three ledgers with 2, 0 and 8 decimal places, so currency formatting is
 *     tested beyond the usual two-decimal assumption
 *   - accounts carrying real constraint flags, including `history` so the
 *     balance chart has something to draw
 *   - an account left with a negative balance, which used to render as "$-1.-50"
 *   - pending transfers in every state: open, posted, partially posted, voided
 *     and expired
 *   - linked chains (payment + fee) that must apply atomically
 *   - enough accounts to page through
 *
 * Safe to run repeatedly: every id is derived from a fresh timestamp.
 */
import { createClient, id as tbid, amount_max } from "tigerbeetle-node";

const CLUSTER = process.env.TB_CLUSTER_ID ?? "0";
const ADDRESS = process.env.TB_ADDRESS ?? "3000";

const AccountFlags = {
  linked: 1,
  debits_must_not_exceed_credits: 2,
  credits_must_not_exceed_debits: 4,
  history: 8,
};
const TransferFlags = {
  linked: 1,
  pending: 2,
  post_pending_transfer: 4,
  void_pending_transfer: 8,
};

const LEDGERS = {
  USD: { id: 1, decimals: 2, label: "USD" },
  JPY: { id: 2, decimals: 0, label: "JPY" },
  BTC: { id: 3, decimals: 8, label: "BTC" },
};

// Account codes double as a chart of accounts.
const CODE = { treasury: 10, customer: 20, revenue: 30, fees: 40, suspense: 50 };
const TCODE = { deposit: 100, payment: 200, fee: 210, refund: 300, settlement: 400 };

const units = (whole, ledger) => BigInt(whole) * 10n ** BigInt(ledger.decimals);

function account(ledger, code, flags = 0) {
  return {
    id: tbid(),
    debits_pending: 0n,
    debits_posted: 0n,
    credits_pending: 0n,
    credits_posted: 0n,
    user_data_128: 0n,
    user_data_64: 0n,
    user_data_32: 0,
    reserved: 0,
    ledger: ledger.id,
    code,
    flags,
    timestamp: 0n,
  };
}

function transfer(debit, credit, amount, code, extra = {}) {
  return {
    id: tbid(),
    debit_account_id: debit.id,
    credit_account_id: credit.id,
    amount,
    pending_id: 0n,
    user_data_128: 0n,
    user_data_64: 0n,
    user_data_32: 0,
    timeout: 0,
    ledger: debit.ledger,
    code,
    flags: 0,
    timestamp: 0n,
    ...extra,
  };
}

const client = createClient({
  cluster_id: BigInt(CLUSTER),
  replica_addresses: [ADDRESS],
});

// A default cluster uses a 32KiB message body, which holds 253 items of 128
// bytes. The oft-quoted 8189 assumes a 1MiB body.
const BATCH_LIMIT = Number(process.env.TB_BATCH_LIMIT) || 253;

function chunk(items, size = BATCH_LIMIT) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

let created = { accounts: 0, transfers: 0 };

async function createAccounts(batch, label) {
  for (const part of chunk(batch)) {
    const errors = await client.createAccounts(part);
    if (errors.length) {
      console.error(`  ${label}: ${errors.length} rejected`, errors.slice(0, 3));
      throw new Error(`account batch "${label}" failed`);
    }
    created.accounts += part.length;
  }
  console.log(`  ${label}: ${batch.length} accounts`);
}

async function createTransfers(batch, label, { expectFailures = 0 } = {}) {
  let rejected = 0;
  for (const part of chunk(batch)) {
    const errors = await client.createTransfers(part);
    rejected += errors.length;
    if (rejected > expectFailures) {
      console.error(`  ${label}: ${errors.length} rejected`, errors.slice(0, 3));
      throw new Error(`transfer batch "${label}" failed`);
    }
    created.transfers += part.length - errors.length;
  }
  console.log(
    `  ${label}: ${batch.length - rejected} transfers` +
      (expectFailures ? ` (${rejected} rejected on purpose)` : "")
  );
}

async function main() {
  console.log(`Seeding cluster ${CLUSTER} at ${ADDRESS}\n`);

  // ---------------------------------------------------------------- accounts
  console.log("Accounts");

  // Treasury accounts fund everything; they are liability-side, so they may
  // only go negative-of-zero in the credits direction.
  const treasuryUsd = account(LEDGERS.USD, CODE.treasury, AccountFlags.history);
  const treasuryJpy = account(LEDGERS.JPY, CODE.treasury, AccountFlags.history);
  const treasuryBtc = account(LEDGERS.BTC, CODE.treasury, AccountFlags.history);
  const feeRevenue = account(LEDGERS.USD, CODE.revenue, AccountFlags.history);

  // Customers cannot be overdrawn, and keep balance history for the chart.
  const alice = account(
    LEDGERS.USD, CODE.customer,
    AccountFlags.debits_must_not_exceed_credits | AccountFlags.history
  );
  const bob = account(
    LEDGERS.USD, CODE.customer,
    AccountFlags.debits_must_not_exceed_credits | AccountFlags.history
  );
  const carol = account(LEDGERS.USD, CODE.customer, AccountFlags.history);
  const yuki = account(LEDGERS.JPY, CODE.customer, AccountFlags.history);
  const satoshi = account(LEDGERS.BTC, CODE.customer, AccountFlags.history);

  // Unconstrained, and left negative on purpose to exercise the formatter.
  const suspense = account(LEDGERS.USD, CODE.suspense, AccountFlags.history);

  await createAccounts(
    [treasuryUsd, treasuryJpy, treasuryBtc, feeRevenue,
     alice, bob, carol, yuki, satoshi, suspense],
    "core"
  );

  // Bulk accounts so the table has something to page through.
  const bulk = Array.from({ length: 120 }, (_, i) =>
    account(LEDGERS.USD, i % 2 ? CODE.customer : CODE.fees,
      i % 3 === 0 ? AccountFlags.history : 0)
  );
  await createAccounts(bulk, "bulk");

  // --------------------------------------------------------------- funding
  console.log("\nFunding");
  await createTransfers([
    transfer(treasuryUsd, alice, units(5000, LEDGERS.USD), TCODE.deposit),
    transfer(treasuryUsd, bob, units(3200, LEDGERS.USD), TCODE.deposit),
    transfer(treasuryUsd, carol, units(150, LEDGERS.USD), TCODE.deposit),
    transfer(treasuryJpy, yuki, units(480000, LEDGERS.JPY), TCODE.deposit),
    transfer(treasuryBtc, satoshi, 250000000n, TCODE.deposit), // 2.5 BTC
  ], "deposits");

  // Leaves `suspense` with a negative balance: it is debited without ever
  // being credited, which is exactly the case that used to render as "$-1.-50".
  await createTransfers(
    [transfer(suspense, treasuryUsd, units(75, LEDGERS.USD), TCODE.settlement)],
    "negative-balance suspense entry"
  );

  // ------------------------------------------------------ linked chains
  console.log("\nLinked chains (payment + fee, atomic)");
  for (const [amount, fee] of [[250, 3], [80, 1], [1200, 12]]) {
    const payment = transfer(
      alice, bob, units(amount, LEDGERS.USD), TCODE.payment,
      { flags: TransferFlags.linked }
    );
    const feeLeg = transfer(alice, feeRevenue, units(fee, LEDGERS.USD), TCODE.fee);
    await createTransfers([payment, feeLeg], `payment ${amount} + fee ${fee}`);
  }

  // A chain that must roll back entirely: the second leg overdraws Carol,
  // who carries debits_must_not_exceed_credits... except she does not, so
  // overdraw Bob instead, who does.
  const doomedA = transfer(bob, alice, units(10, LEDGERS.USD), TCODE.payment,
    { flags: TransferFlags.linked });
  const doomedB = transfer(bob, alice, units(999999, LEDGERS.USD), TCODE.payment);
  await createTransfers([doomedA, doomedB], "chain that must roll back",
    { expectFailures: 2 });

  // ------------------------------------------------------ two-phase transfers
  console.log("\nTwo-phase transfers");

  const openPending = transfer(alice, carol, units(400, LEDGERS.USD), TCODE.payment,
    { flags: TransferFlags.pending });
  const toPost = transfer(alice, carol, units(120, LEDGERS.USD), TCODE.payment,
    { flags: TransferFlags.pending });
  const toPartPost = transfer(alice, carol, units(300, LEDGERS.USD), TCODE.payment,
    { flags: TransferFlags.pending });
  const toVoid = transfer(bob, carol, units(90, LEDGERS.USD), TCODE.payment,
    { flags: TransferFlags.pending });
  // One-second timeout so it is already expired by the time anyone looks.
  const toExpire = transfer(bob, carol, units(45, LEDGERS.USD), TCODE.payment,
    { flags: TransferFlags.pending, timeout: 1 });

  await createTransfers(
    [openPending, toPost, toPartPost, toVoid, toExpire],
    "pending reservations"
  );

  const resolve = (pending, flags, amount) => ({
    id: tbid(),
    debit_account_id: 0n,
    credit_account_id: 0n,
    amount,
    pending_id: pending.id,
    user_data_128: 0n,
    user_data_64: 0n,
    user_data_32: 0,
    timeout: 0,
    ledger: pending.ledger,
    code: pending.code,
    flags,
    timestamp: 0n,
  });

  await createTransfers([
    resolve(toPost, TransferFlags.post_pending_transfer, amount_max),
    // Posts 100 of the 300 reserved; TigerBeetle voids the remaining 200.
    resolve(toPartPost, TransferFlags.post_pending_transfer, units(100, LEDGERS.USD)),
    resolve(toVoid, TransferFlags.void_pending_transfer, 0n),
  ], "post / partial post / void");

  // ------------------------------------------------------------ bulk volume
  console.log("\nBulk transfers");
  const customers = bulk.filter((_, i) => i % 2);
  const batch = [];
  for (let i = 0; i < 400; i++) {
    const target = customers[i % customers.length];
    batch.push(transfer(treasuryUsd, target,
      units(10 + (i % 90), LEDGERS.USD),
      i % 5 === 0 ? TCODE.refund : TCODE.deposit));
  }
  await createTransfers(batch, "volume");

  // ------------------------------------------------------------------ report
  const ids = [alice, bob, carol, yuki, satoshi, suspense].map((a) => a.id);
  const finals = await client.lookupAccounts(ids);
  const names = ["alice(USD)", "bob(USD)", "carol(USD)", "yuki(JPY)", "satoshi(BTC)", "suspense(USD)"];

  console.log("\nResulting balances");
  finals.forEach((a, i) => {
    const bal = a.credits_posted - a.debits_posted;
    console.log(
      `  ${names[i].padEnd(14)} balance=${String(bal).padStart(12)}` +
      `  pending(dr)=${a.debits_pending}`
    );
  });

  console.log(
    `\nSeeded ${created.accounts} accounts and ${created.transfers} transfers.`
  );
  console.log("Open pending reservations remain on alice and bob.");
  await client.destroy();
}

main().catch((err) => {
  console.error("\nSeed failed:", err.message);
  process.exit(1);
});
