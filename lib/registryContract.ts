import type { MidenTransaction } from "@miden-sdk/miden-wallet-adapter-base";
import { Transaction } from "@miden-sdk/miden-wallet-adapter-base";
import { MINIMAL_REGISTRY_COMPONENT_SOURCE } from "@/lib/midenCompileTest";
import type { MidenClient } from "@/lib/midenClient";

type WordLiteral = [number, number, number, number];

export const EXAMPLE_REGISTRY_ACCOUNT_ID =
  "0xa5eaee5da2353310386c93fe4ed69b";
const STALE_REGISTRY_ACCOUNT_IDS = new Set([
  "0x380a8d8b0b61d21013bbfa8ccc56e5",
]);

export const REGISTRY_ACCOUNT_ID =
  process.env.NEXT_PUBLIC_MIDEN_REGISTRY_ACCOUNT_ID ??
  EXAMPLE_REGISTRY_ACCOUNT_ID;

const REGISTRY_ACCOUNT_ID_STORAGE_KEY = "mns:registryAccountId";

export function getRegistryAccountId() {
  if (typeof window !== "undefined") {
    const storedAccountId = window.localStorage.getItem(
      REGISTRY_ACCOUNT_ID_STORAGE_KEY,
    );

    if (storedAccountId) {
      if (STALE_REGISTRY_ACCOUNT_IDS.has(storedAccountId)) {
        window.localStorage.setItem(
          REGISTRY_ACCOUNT_ID_STORAGE_KEY,
          REGISTRY_ACCOUNT_ID,
        );
        return REGISTRY_ACCOUNT_ID;
      }

      return storedAccountId;
    }
  }

  return REGISTRY_ACCOUNT_ID;
}

export function getRegistryAccountIdSource() {
  if (
    typeof window !== "undefined" &&
    window.localStorage.getItem(REGISTRY_ACCOUNT_ID_STORAGE_KEY)
  ) {
    return "localStorage";
  }

  return process.env.NEXT_PUBLIC_MIDEN_REGISTRY_ACCOUNT_ID
    ? "env"
    : "default";
}

export function setRegistryAccountIdOverride(accountId: string) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(REGISTRY_ACCOUNT_ID_STORAGE_KEY, accountId);
}

export function createTemporaryWordFromText(value: string): WordLiteral {
  const parts: WordLiteral = [0, 0, 0, 0];

  for (let index = 0; index < value.length; index += 1) {
    const part = index % parts.length;
    parts[part] =
      (Math.imul(parts[part], 16777619) ^ value.charCodeAt(index)) >>> 0;
  }

  return parts;
}

function formatWordPush(word: WordLiteral) {
  return `push.${word.join(".")}`;
}

function wordLiteralToBigUint64Array(word: WordLiteral) {
  return BigUint64Array.from(word.map((part) => BigInt(part)));
}

function feltsToWordLiteral(felts: unknown[]): WordLiteral {
  if (felts.length < 4) {
    throw new Error(`Resolve returned ${felts.length} felt(s), expected 4.`);
  }

  return felts.slice(0, 4).map((felt) => {
    const value =
      typeof felt === "object" &&
      felt !== null &&
      "asInt" in felt &&
      typeof felt.asInt === "function"
        ? felt.asInt()
        : BigInt(String(felt));
    return Number(value);
  }) as WordLiteral;
}

function wordLiteralEquals(left: WordLiteral, right: WordLiteral) {
  return left.every((part, index) => part === right[index]);
}

export async function createSimpleTransactionScriptFallback(input: {
  client: MidenClient;
  walletAccountId: string;
}): Promise<MidenTransaction> {
  const { TransactionRequestBuilder } = await import("@miden-sdk/miden-sdk");

  const script = await input.client.compile.txScript({
    code: "begin push.1 drop end",
  });
  const transactionRequest = new TransactionRequestBuilder()
    .withCustomScript(script)
    .build();

  return Transaction.createCustomTransaction(
    input.walletAccountId,
    input.walletAccountId,
    transactionRequest,
  );
}

export async function createRegistryPingTransaction(input: {
  client: MidenClient;
  walletAccountId: string;
}): Promise<MidenTransaction> {
  const {
    AccountId,
    AccountStorageRequirements,
    ForeignAccount,
    ForeignAccountArray,
    Linking,
    TransactionRequestBuilder,
  } = await import(
    "@miden-sdk/miden-sdk"
  );

  const configuredRegistryAccountId = getRegistryAccountId();
  const registryAccountId = AccountId.fromHex(configuredRegistryAccountId);
  const component = await input.client.compile.component({
    code: MINIMAL_REGISTRY_COMPONENT_SOURCE,
    supportAllTypes: true,
  });
  const pingHash = component.getProcedureHash("ping");
  const script = await input.client.compile.txScript({
    code: `use mns::registry
begin
    call.registry::ping
    drop
end`,
    libraries: [
      {
        namespace: "mns::registry",
        code: MINIMAL_REGISTRY_COMPONENT_SOURCE,
        linking: Linking.Dynamic,
      },
    ],
  });
  const foreignAccounts = new ForeignAccountArray([
    ForeignAccount.public(registryAccountId, new AccountStorageRequirements()),
  ]);
  const transactionRequest = new TransactionRequestBuilder()
    .withCustomScript(script)
    .withForeignAccounts(foreignAccounts)
    .build();

  const transaction = Transaction.createCustomTransaction(
    input.walletAccountId,
    configuredRegistryAccountId,
    transactionRequest,
  );
  return Object.assign(transaction, {
    registryPingProcedureHash: pingHash,
  });
}

export async function createRegistryRegisterTransaction(input: {
  client: MidenClient;
  walletAccountId: string;
  nameHashWord?: WordLiteral;
  ownerWord?: WordLiteral;
}): Promise<MidenTransaction> {
  const {
    AccountId,
    AccountStorageRequirements,
    ForeignAccount,
    ForeignAccountArray,
    Linking,
    TransactionRequestBuilder,
  } = await import("@miden-sdk/miden-sdk");

  const configuredRegistryAccountId = getRegistryAccountId();
  const registryAccountId = AccountId.fromHex(configuredRegistryAccountId);
  const component = await input.client.compile.component({
    code: MINIMAL_REGISTRY_COMPONENT_SOURCE,
    supportAllTypes: true,
  });
  const registerHash = component.getProcedureHash("register");
  const nameHashWord =
    input.nameHashWord ?? createTemporaryWordFromText("example.miden");
  const ownerWord =
    input.ownerWord ?? createTemporaryWordFromText(input.walletAccountId);
  const script = await input.client.compile.txScript({
    code: `use mns::registry
begin
    ${formatWordPush(nameHashWord)}
    ${formatWordPush(ownerWord)}
    call.registry::register
end`,
    libraries: [
      {
        namespace: "mns::registry",
        code: MINIMAL_REGISTRY_COMPONENT_SOURCE,
        linking: Linking.Dynamic,
      },
    ],
  });
  const foreignAccounts = new ForeignAccountArray([
    ForeignAccount.public(registryAccountId, new AccountStorageRequirements()),
  ]);
  const transactionRequest = new TransactionRequestBuilder()
    .withCustomScript(script)
    .withForeignAccounts(foreignAccounts)
    .build();

  const transaction = Transaction.createCustomTransaction(
    input.walletAccountId,
    configuredRegistryAccountId,
    transactionRequest,
  );
  return Object.assign(transaction, {
    registryRegisterProcedureHash: registerHash,
  });
}

export async function verifyRegistryOwner(input: {
  client: MidenClient;
  walletAccountId: string;
  nameHashWord: WordLiteral;
  ownerWord: WordLiteral;
}): Promise<{ ownerWord: WordLiteral; matches: boolean; registryAccountId: string }> {
  const {
    AccountId,
    AccountStorageRequirements,
    Linking,
    SlotAndKeys,
    Word,
  } = await import("@miden-sdk/miden-sdk");

  const configuredRegistryAccountId = getRegistryAccountId();
  const registryAccountId = AccountId.fromHex(configuredRegistryAccountId);
  const nameHash = new Word(wordLiteralToBigUint64Array(input.nameHashWord));
  const storageRequirements = AccountStorageRequirements.fromSlotAndKeysArray([
    new SlotAndKeys("mns::names", [nameHash]),
  ]);
  const script = await input.client.compile.txScript({
    code: `use mns::registry
begin
    ${formatWordPush(input.nameHashWord)}
    call.registry::resolve
end`,
    libraries: [
      {
        namespace: "mns::registry",
        code: MINIMAL_REGISTRY_COMPONENT_SOURCE,
        linking: Linking.Dynamic,
      },
    ],
  });
  const stack = await input.client.transactions.executeProgram({
    account: input.walletAccountId,
    script,
    foreignAccounts: [
      {
        id: registryAccountId.toString(),
        storage: storageRequirements,
      },
    ],
  });
  const ownerWord = feltsToWordLiteral(
    Array.from({ length: stack.length() }, (_, index) => stack.get(index)),
  );

  return {
    ownerWord,
    matches: wordLiteralEquals(ownerWord, input.ownerWord),
    registryAccountId: configuredRegistryAccountId,
  };
}
