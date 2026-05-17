export type RegistryRecord = {
  name: string;
  owner: string;
  target: string;
  status: "Active";
};

export type RegistryAdapterState = {
  records: RegistryRecord[];
  reservedNames: string[];
};

type RegisterNameInput = {
  name: string;
  owner: string;
  target: string;
  state: RegistryAdapterState;
};

type RegisterNameResult = {
  record: RegistryRecord;
  state: RegistryAdapterState;
};

type ResolveNameInput = {
  name: string;
  state: RegistryAdapterState;
};

export async function resolveName({
  name,
  state,
}: ResolveNameInput): Promise<RegistryRecord | null> {
  return state.records.find((record) => record.name === name) ?? null;
}

export async function registerName({
  name,
  owner,
  target,
  state,
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
