import type { MidenTransaction } from "@demox-labs/miden-wallet-adapter";

type RegistryRegisterInput = {
  name: string;
  owner: string;
  target: string;
};

const REGISTRY_ACCOUNT_ID = process.env.NEXT_PUBLIC_MIDEN_REGISTRY_ACCOUNT_ID;

export const registryContractBlocker =
  "Registry transaction blocked: no deployed Miden registry account/component is configured. " +
  "Set NEXT_PUBLIC_MIDEN_REGISTRY_ACCOUNT_ID after deploying the registry account, then add confirmed nameHash and owner Word encoding plus the registry transaction script.";

export async function createRegistryRegisterTransaction(
  input: RegistryRegisterInput,
): Promise<MidenTransaction> {
  if (!REGISTRY_ACCOUNT_ID) {
    throw new Error(
      `${registryContractBlocker} Requested registration: ${input.name} -> ${input.owner}.`,
    );
  }

  throw new Error(
    [
      `Registry account ${REGISTRY_ACCOUNT_ID} is configured, but the browser transaction is still blocked.`,
      "Missing confirmed APIs: normalized name -> Word hash, wallet account id -> owner Word, registry ForeignAccount requirements, and transaction script argument wiring.",
      `Requested registration: ${input.name} owner ${input.owner} target ${input.target}.`,
    ].join(" "),
  );
}
