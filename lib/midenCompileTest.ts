import type { MidenClient } from "@/lib/midenClient";

const MINIMAL_MUTABLE_CONTRACT_SOURCE = `# Minimal component used only to test the Miden v0.14 compile path.
#
# This does not deploy an account and does not write registry storage.
export.ping
    push.1
end
`;

const MINIMAL_REGISTRY_COMPONENT_SOURCE = `# Minimal registry-shaped component for testing Miden v0.14 component compile.
#
# Required component format:
# - account components use exported procedures, e.g. export.register
# - transaction scripts use begin/end instead and are not valid here
# - this smoke test avoids storage slots and registry writes on purpose
#
# Stack contract:
# - register receives [NAME_HASH, OWNER] and drops both words
# - resolve receives [NAME_HASH] and returns an empty owner word
export.register
    dropw
    dropw
end

export.resolve
    dropw
    push.0.0.0.0
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
  const { AccountType } = await import("@miden-sdk/miden-sdk/lazy");

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
    },
  };
}

export async function compileMinimalRegistryComponent(
  client: MidenClient,
): Promise<MutableContractCompileResult> {
  const { AccountType } = await import("@miden-sdk/miden-sdk/lazy");

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
      register: component.getProcedureHash("register"),
      resolve: component.getProcedureHash("resolve"),
    },
  };
}
