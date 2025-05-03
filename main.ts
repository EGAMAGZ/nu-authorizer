export type Transaction = {
  amount: number;
  merchant: string;
  time: number;
};

export type Account = {
  active: boolean;
  availableLimit: number;
  history: Transaction[];
};

export type Result = {
  account: Account;
  violations: string[];
};

export type Validation = (
  transaction: Transaction,
  account: Account,
) => string | null;

const TWO_MINUTES_MS = 120_000;

const validateActiveAccount = (_transaction: Transaction, account: Account) =>
  !account.active ? "account-not-active" : null;

const validateLimit = (transaction: Transaction, account: Account) =>
  transaction.amount > account.availableLimit ? "insufficient-limit" : null;

const validateFirstTransaction = (
  transaction: Transaction,
  account: Account,
) => {
  if (account.history.length > 0) return null;
  const maxAmount = account.availableLimit * 0.90;

  if (transaction.amount > maxAmount) {
    return "first-transaction-above-threshold";
  }
  return null;
};

const validateHighFrequency = (transaction: Transaction, account: Account) => {
  const twoMinutesAgo = transaction.time - TWO_MINUTES_MS;
  const recentTransactions = account.history.filter(
    (t) => t.time >= twoMinutesAgo && t.merchant === transaction.merchant,
  );

  return recentTransactions.length >= 3
    ? "high-frequency-small-interval"
    : null;
};

const validateDoubledTransaction = (
  transaction: Transaction,
  account: Account,
) => {
  const twoMinutesAgo = transaction.time - TWO_MINUTES_MS;
  const similarTransactions = account.history.filter(
    (t) =>
      t.time >= twoMinutesAgo &&
      t.merchant === transaction.merchant &&
      t.amount === transaction.amount,
  );

  return similarTransactions.length >= 1 ? "doubled-transaction" : null;
};

export function authorize(transaction: Transaction, account: Account): Result {
  const validations: Validation[] = [
    validateActiveAccount,
    validateLimit,
    validateFirstTransaction,
    validateHighFrequency,
    validateDoubledTransaction,
  ];

  const violations = validations
    .map((validation) => validation(transaction, account))
    .filter((violation) => violation !== null);

  if (violations.length === 0) {
    return {
      account: {
        ...account,
        history: [...account.history, transaction],
      },
      violations,
    };
  }

  return {
    account,
    violations,
  };
}
