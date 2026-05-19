import type { MidenClient } from "@/lib/midenClient";

const MINIMAL_MUTABLE_CONTRACT_SOURCE = `# Minimal component used only to test the Miden v0.14 compile path.
#
# This does not deploy an account and does not write registry storage.
pub proc ping
    push.1
end
`;

export const MINIMAL_REGISTRY_COMPONENT_SOURCE = `use miden::protocol::active_account
use miden::protocol::native_account
use miden::core::word

const NAMES_SLOT = word("mns::names")

#! Minimal registry component compile smoke test.
#!
#! This component uses the TypeScript-supplied StorageMap slot named mns::names.
#! Stack contracts:
#! - ping: [] -> [1]
#! - register: [NAME_HASH, OWNER] -> []
#! - resolve: [NAME_HASH] -> [OWNER]
pub proc ping
    push.1
end

pub proc register
    push.NAMES_SLOT[0..2]
    exec.native_account::set_map_item
    dropw
end

pub proc resolve
    push.NAMES_SLOT[0..2]
    exec.active_account::get_map_item
end
`;

export type MutableContractCompileResult = {
  accountType: string;
  accountTypeValue: number;
  storageSlots?: string[];
  procedureCount: number;
  procedures: string[];
  procedureHashes: Record<string, string>;
};

export type LocalRegistryAccountResult = MutableContractCompileResult & {
  accountId: string;
  publishTransactionId: string;
  storageMode: string;
};

export async function compileMinimalMutableContract(
  client: MidenClient,
): Promise<MutableContractCompileResult> {
  const { AccountType } = await import("@miden-sdk/miden-sdk");

  const component = await client.compile.component({
    code: MINIMAL_MUTABLE_CONTRACT_SOURCE,
    supportAllTypes: true,
  });

  const procedures = component
    .getProcedures()
    .map((procedure) => String(procedure));

  return {
    accountType: "AccountType.RegularAccountUpdatableCode",
    accountTypeValue: AccountType.RegularAccountUpdatableCode,
    procedureCount: procedures.length,
    procedures,
    procedureHashes: {
      ping: component.getProcedureHash("ping"),
      register: component.getProcedureHash("register"),
      resolve: component.getProcedureHash("resolve"),
    },
  };
}

export async function compileMinimalRegistryComponent(
  client: MidenClient,
): Promise<MutableContractCompileResult> {
  const { AccountType, StorageMap, StorageSlot } = await import(
    "@miden-sdk/miden-sdk"
  );

  const registryMapSlotName = "mns::names";
  const registryMap = new StorageMap();
  const registryMapSlot = StorageSlot.map(registryMapSlotName, registryMap);

  const component = await client.compile.component({
    code: MINIMAL_REGISTRY_COMPONENT_SOURCE,
    slots: [registryMapSlot],
    supportAllTypes: true,
  });

  const procedures = component
    .getProcedures()
    .map((procedure) => String(procedure));

  return {
    accountType: "AccountType.RegularAccountUpdatableCode",
    accountTypeValue: AccountType.RegularAccountUpdatableCode,
    storageSlots: [registryMapSlotName],
    procedureCount: procedures.length,
    procedures,
    procedureHashes: {
      ping: component.getProcedureHash("ping"),
      register: component.getProcedureHash("register"),
      resolve: component.getProcedureHash("resolve"),
    },
  };
}

export async function createLocalRegistryAccount(
  client: MidenClient,
): Promise<LocalRegistryAccountResult> {
  if (typeof window === "undefined") {
    throw new Error("Registry account creation can only run in the browser.");
  }

  const { AccountType, AuthSecretKey, StorageMap, StorageMode, StorageSlot } =
    await import("@miden-sdk/miden-sdk");

  const registryMapSlotName = "mns::names";
  const registryMap = new StorageMap();
  const registryMapSlot = StorageSlot.map(registryMapSlotName, registryMap);

  const component = await client.compile.component({
    code: MINIMAL_REGISTRY_COMPONENT_SOURCE,
    slots: [registryMapSlot],
    supportAllTypes: true,
  });

  const seed = crypto.getRandomValues(new Uint8Array(32));
  const auth = AuthSecretKey.rpoFalconWithRNG();

  const account = await client.accounts.create({
    type: AccountType.RegularAccountUpdatableCode,
    seed,
    auth,
    components: [component],
    storage: StorageMode.Public,
  });
  const publishScript = await client.compile.txScript({
    code: "begin push.1 drop end",
  });
  const publishResult = await client.transactions.execute({
    account,
    script: publishScript,
    waitForConfirmation: true,
    timeout: 120_000,
  });
  await client.sync();

  const procedures = component
    .getProcedures()
    .map((procedure) => String(procedure));

  return {
    accountId: account.id().toString(),
    publishTransactionId: publishResult.txId.toHex(),
    accountType: "AccountType.RegularAccountUpdatableCode",
    accountTypeValue: AccountType.RegularAccountUpdatableCode,
    storageMode: StorageMode.Public,
    storageSlots: [registryMapSlotName],
    procedureCount: procedures.length,
    procedures,
    procedureHashes: {
      ping: component.getProcedureHash("ping"),
      register: component.getProcedureHash("register"),
      resolve: component.getProcedureHash("resolve"),
    },
  };
}
