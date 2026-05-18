import type { MidenClient } from "@/lib/midenClient";

const MINIMAL_MUTABLE_CONTRACT_SOURCE = `# Minimal component used only to test the Miden v0.14 compile path.
#
# This does not deploy an account and does not write registry storage.
pub proc ping
    push.1
end
`;

const MINIMAL_REGISTRY_COMPONENT_SOURCE = `#! Minimal registry component compile smoke test.
#!
#! This intentionally handles placeholder stack inputs while the first
#! storage syntax test supplies an empty StorageMap slot from TypeScript.
#! Stack contracts:
#! - ping: [] -> [1]
#! - register: [NAME_HASH, OWNER] -> []
#! - resolve: [NAME_HASH] -> [PLACEHOLDER_OWNER]
pub proc ping
    push.1
end

pub proc register
    dropw
    dropw
end

pub proc resolve
    dropw
    push.0.0.0.0
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

  const registryMapSlotName = "mns.names";
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
