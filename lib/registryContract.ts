import type { MidenTransaction } from "@miden-sdk/miden-wallet-adapter-base";
import { Transaction } from "@miden-sdk/miden-wallet-adapter-base";
import { MINIMAL_REGISTRY_COMPONENT_SOURCE } from "@/lib/midenCompileTest";
import type { MidenClient } from "@/lib/midenClient";

type WordLiteral = [number, number, number, number];

export const EXAMPLE_REGISTRY_ACCOUNT_ID =
  "0x380a8d8b0b61d21013bbfa8ccc56e5";

export const REGISTRY_ACCOUNT_ID =
  process.env.NEXT_PUBLIC_MIDEN_REGISTRY_ACCOUNT_ID ??
  EXAMPLE_REGISTRY_ACCOUNT_ID;

export function getRegistryAccountId() {
  return REGISTRY_ACCOUNT_ID;
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

  const registryAccountId = AccountId.fromHex(REGISTRY_ACCOUNT_ID);
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
    REGISTRY_ACCOUNT_ID,
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

  const registryAccountId = AccountId.fromHex(REGISTRY_ACCOUNT_ID);
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
    REGISTRY_ACCOUNT_ID,
    transactionRequest,
  );
  return Object.assign(transaction, {
    registryRegisterProcedureHash: registerHash,
  });
}
