import type { MidenClient } from "@/lib/midenClient";

export type RegistryRecord = {
  name: string;
  owner: string;
  target: string;
  status: "Active";
};

export type RegistryAdapterMode = "local" | "miden";

export type RegistryAdapterState = {
  records: RegistryRecord[];
  reservedNames: string[];
};

type RegisterNameInput = {
  mode?: RegistryAdapterMode;
  name: string;
  owner: string;
  target: string;
  state: RegistryAdapterState;
  client?: MidenClient | null;
  accountId?: string;
};

type RegisterNameResult = {
  record: RegistryRecord;
  state: RegistryAdapterState;
};

type ResolveNameInput = {
  mode?: RegistryAdapterMode;
  name: string;
  state: RegistryAdapterState;
  client?: MidenClient | null;
  accountId?: string;
};

export async function resolveName({
  name,
  state,
}: ResolveNameInput): Promise<RegistryRecord | null> {
  // Miden mode still resolves from local state until the registry account exists.
  return state.records.find((record) => record.name === name) ?? null;
}

export async function registerName({
  mode = "local",
  name,
  owner,
  target,
  state,
  client,
  accountId,
}: RegisterNameInput): Promise<RegisterNameResult> {
  const existingRecord = await resolveName({ name, state });

  if (existingRecord || state.reservedNames.includes(name)) {
    throw new Error(`${name} is already taken.`);
  }

  if (!owner.trim()) {
    throw new Error("A Miden account id is required before registering.");
  }

  if (!target.trim()) {
    throw new Error("A target address is required before registering.");
  }

  if (mode === "miden") {
    if (!client) {
      throw new Error("Miden registry mode requires a connected MidenClient.");
    }

    if (!accountId?.trim()) {
      throw new Error("Miden registry mode requires the current account id.");
    }

    if (accountId.trim() !== owner.trim()) {
      throw new Error("Miden registry owner must match the current account id.");
    }

    // TODO: custom account component + StorageMap write.
    // The real path is: compile/deploy a registry account component, hash the
    // normalized name into a Word key, and submit a transaction that writes the
    // owner/target record into the registry account StorageMap.
    throw new Error(
      "Miden onchain registry write not implemented yet. TODO: custom account component + StorageMap write.",
    );
  }

  const record: RegistryRecord = {
    name,
    owner: owner.trim(),
    target: target.trim(),
    status: "Active",
  };

  return {
    record,
    state: {
      ...state,
      records: [record, ...state.records],
    },
  };
}
