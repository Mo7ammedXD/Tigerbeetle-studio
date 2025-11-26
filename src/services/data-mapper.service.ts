import type { Account, Transfer } from "../types/backup.types";
import type { AccountData, TransferData } from "../types/window";

export class DataMapperService {
  static accountToAccountData(account: Account): AccountData {
    return {
      id: account.id,
      ledger: account.ledger,
      code: account.code,
      alias: account.alias || "",
      flags: account.flags,
    };
  }

  static transferToTransferData(transfer: Transfer): TransferData {
    return {
      id: transfer.id,
      debit_account_id: transfer.debit_account_id,
      credit_account_id: transfer.credit_account_id,
      amount: transfer.amount,
      ledger: transfer.ledger,
      code: transfer.code,
      flags: transfer.flags,
    };
  }

  static accountDataToAccount(
    data: AccountData,
    additionalFields?: Partial<Account>
  ): Account {
    return {
      id: data.id || "",
      alias: data.alias,
      ledger: data.ledger,
      code: data.code,
      balance: "0",
      debits_posted: "0",
      credits_posted: "0",
      flags: data.flags,
      ...additionalFields,
    };
  }

  static transferDataToTransfer(
    data: TransferData,
    additionalFields?: Partial<Transfer>
  ): Transfer {
    return {
      id: data.id || "",
      debit_account_id: data.debit_account_id,
      credit_account_id: data.credit_account_id,
      amount: data.amount,
      ledger: data.ledger,
      code: data.code,
      flags: data.flags,
      ...additionalFields,
    };
  }
}
