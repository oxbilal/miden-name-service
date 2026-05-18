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
#! This intentionally adds registry procedures without storage first.
pub proc ping
    push.1
end

pub proc register
end

pub proc resolve
end
`;

export type MutableContractCompileResult = {
  accountType: string;
  accountTypeValue: number;
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
  const { AccountType } = await import("@miden-sdk/miden-sdk");

  const component = await client.compile.component({
    code: MINIMAL_REGISTRY_COMPONENT_SOURCE,
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
    },
  };
}
