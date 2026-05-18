import type { MidenTransaction } from "@miden-sdk/miden-wallet-adapter-base";
import { Transaction } from "@miden-sdk/miden-wallet-adapter-base";
import { MINIMAL_REGISTRY_COMPONENT_SOURCE } from "@/lib/midenCompileTest";
import type { MidenClient } from "@/lib/midenClient";

type RegistryRegisterInput = {
  name: string;
  owner: string;
  target: string;
};

export const EXAMPLE_REGISTRY_ACCOUNT_ID =
  "0x380a8d8b0b61d21013bbfa8ccc56e5";

export const REGISTRY_ACCOUNT_ID =
  process.env.NEXT_PUBLIC_MIDEN_REGISTRY_ACCOUNT_ID ??
  EXAMPLE_REGISTRY_ACCOUNT_ID;

export const registryContractBlocker =
  "Registry transaction blocked at the configured registry account boundary. " +
  "The SDK registry account id is configured, but the confirmed transaction script for invoking register(nameHash, owner) is still missing, and MASM StorageMap write syntax is still unconfirmed.";

export function getRegistryAccountId() {
  return REGISTRY_ACCOUNT_ID;
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

export async function createRegistryRegisterPlaceholderTransaction(input: {
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
  } = await import("@miden-sdk/miden-sdk");

  const registryAccountId = AccountId.fromHex(REGISTRY_ACCOUNT_ID);
  const component = await input.client.compile.component({
    code: MINIMAL_REGISTRY_COMPONENT_SOURCE,
    supportAllTypes: true,
  });
  const registerHash = component.getProcedureHash("register");
  const script = await input.client.compile.txScript({
    code: `use mns::registry
begin
    push.1.2.3.4
    push.5.6.7.8
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

export async function createRegistryRegisterTransaction(
  input: RegistryRegisterInput,
): Promise<MidenTransaction> {
  if (!REGISTRY_ACCOUNT_ID) {
    throw new Error(
      `${registryContractBlocker} Requested registration: ${input.name} -> ${input.owner}.`,
    );
  }

  const { AccountId } = await import("@miden-sdk/miden-sdk");
  const registryAccountId = AccountId.fromHex(REGISTRY_ACCOUNT_ID);

  throw new Error(
    [
      `Registry account ${registryAccountId.toString()} is configured and parses with AccountId.fromHex.`,
      "Register is not sent because the confirmed transaction script for targeting the registry register procedure is missing.",
      "Still blocked: normalized name -> Word hash, wallet account id -> owner Word, procedure invocation script, and MASM StorageMap write syntax for mns::names.",
      `Requested registration: ${input.name} owner ${input.owner} target ${input.target}.`,
    ].join(" "),
  );
}
