import { assertEquals, assertObjectMatch } from "@std/assert";
import {
  type Account,
  authorize,
  type Result,
  type Transaction,
} from "./main.ts";

Deno.test("account-not-active", () => {
  const transaction: Transaction = {
    amount: 10,
    merchant: "Burger King",
    time: Date.now(),
  };

  const account: Account = {
    active: false,
    availableLimit: 100,
    history: [],
  };

  const result: Result = authorize(transaction, account);

  assertObjectMatch(result.account, {
    active: false,
    availableLimit: 100,
    history: [],
  } as Account);

  assertEquals(result.violations, ["account-not-active"]);
});

Deno.test("insufficient-limit", () => {
  const now = Date.now();

  const transaction: Transaction = {
    amount: 10,
    merchant: "Burger King",
    time: now,
  };

  const account: Account = {
    active: true,
    availableLimit: 8,
    history: [{
      merchant: "Carls Jr.",
      amount: 10,
      time: now - 300_000,
    }],
  };

  const result: Result = authorize(transaction, account);

  assertObjectMatch(result.account, {
    active: true,
    availableLimit: 8,
    history: [],
  } as Account);

  assertEquals(result.violations, ["insufficient-limit"]);
});

Deno.test("first-transaction-above-threshold", () => {
  const transaction: Transaction = {
    amount: 91,
    merchant: "Burger King",
    time: Date.now(),
  };

  const account: Account = {
    active: true,
    availableLimit: 100,
    history: [],
  };

  const result: Result = authorize(transaction, account);

  assertObjectMatch(result.account, {
    active: true,
    availableLimit: 100,
    history: [],
  } as Account);

  assertEquals(result.violations, ["first-transaction-above-threshold"]);
});

Deno.test("high-frequency-small-interval", () => {
  const now = Date.now();
  const transaction: Transaction = {
    amount: 40,
    merchant: "Burger King",
    time: now,
  };

  const account: Account = {
    active: true,
    availableLimit: 100,
    history: [
      {
        amount: 10,
        merchant: "Burger King",
        time: now - 30_000, // 30 seconds ago
      },
      {
        amount: 20,
        merchant: "Burger King",
        time: now - 60_000, // 1 minute ago
      },
      {
        amount: 30,
        merchant: "Burger King",
        time: now - 90_000, // 1.5 minutes ago
      },
    ],
  };

  const result: Result = authorize(transaction, account);

  assertObjectMatch(result.account, {
    active: true,
    availableLimit: 100,
    history: account.history,
  } as Account);

  assertEquals(result.violations, ["high-frequency-small-interval"]);
});

Deno.test("doubled-transaction", () => {
  const now = Date.now();
  const transaction: Transaction = {
    amount: 10,
    merchant: "Burger King",
    time: now,
  };

  const account: Account = {
    active: true,
    availableLimit: 100,
    history: [
      {
        amount: 10,
        merchant: "Burger King",
        time: now - 30_000, // 30 seconds ago
      },
    ],
  };

  const result: Result = authorize(transaction, account);

  assertObjectMatch(result.account, {
    active: true,
    availableLimit: 100,
    history: account.history,
  } as Account);

  assertEquals(result.violations, ["doubled-transaction"]);
});
