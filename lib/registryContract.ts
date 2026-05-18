import type { MidenTransaction } from "@miden-sdk/miden-wallet-adapter-base";
import { Transaction } from "@miden-sdk/miden-wallet-adapter-base";
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

export async function createRegistryPingTransaction(input: {
  client: MidenClient;
  walletAccountId: string;
}): Promise<MidenTransaction> {
  const { AccountId, TransactionRequestBuilder } = await import(
    "@miden-sdk/miden-sdk"
  );

  AccountId.fromHex(REGISTRY_ACCOUNT_ID);
  const script = await input.client.compile.txScript({
    code: "begin push.1 drop end",
  });
  const transactionRequest = new TransactionRequestBuilder()
    .withCustomScript(script)
    .build();

  return Transaction.createCustomTransaction(
    input.walletAccountId,
    REGISTRY_ACCOUNT_ID,
    transactionRequest,
  );
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
