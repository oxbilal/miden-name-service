# Registry Deploy v0.14 Browser SDK Path

This document tracks the browser-only Miden SDK v0.14 path for turning the currently compiling registry component into a registry account. It intentionally does not use `cargo-miden`.

## Current Ready Pieces

- The app already compiles a minimal account component with `ping`, `register`, and `resolve`.
- The component is compiled in the browser with `client.compile.component(...)`.
- The TypeScript storage slot setup works with `StorageMap` and `StorageSlot.map("mns::names", registryMap)`.
- Storage read/write inside MASM is still blocked, so `register` and `resolve` are placeholders.

## Confirmed Installed SDK APIs

These APIs were found in `node_modules/@miden-sdk/miden-sdk/dist/st`.

### Compile Component

`client.compile.component(...)` is implemented as:

```ts
await client.compile.component({
  code,
  slots,
  supportAllTypes,
});
```

It compiles account component source with `compileAccountComponentCode(code)` and wraps it with `AccountComponent.compile(compiled, slots)`.

### Contract Account Creation

`client.accounts.create(...)` supports contract creation through `ContractCreateOptions`:

```ts
export interface ContractCreateOptions {
  type?: AccountTypeValue;
  seed: Uint8Array;
  auth: AuthSecretKey;
  components: AccountComponent[];
  storage?: StorageMode;
}
```

Confirmed constants in the installed declaration files:

```ts
AccountType.RegularAccountImmutableCode;
AccountType.RegularAccountUpdatableCode;
StorageMode.Public;
StorageMode.Private;
StorageMode.Network;
```

The runtime implementation also checks `ImmutableContract` and
`MutableContract` aliases, but the installed public TypeScript export does not
expose those aliases in this project. Use `RegularAccountUpdatableCode` for the
browser smoke test until the package declarations expose the contract aliases.

Confirmed auth key API:

```ts
AuthSecretKey.rpoFalconWithRNG(seed?: Uint8Array | null);
AuthSecretKey.ecdsaWithRNG(seed?: Uint8Array | null);
```

The installed SDK implementation builds contract accounts by creating an auth component, adding each compiled component to `AccountBuilder`, building the account, and inserting it into the local client store with `newAccountWithSecretKey(account, auth)`. This local insert is not enough for the RPC node to find the account as a foreign account.

## Smallest Confirmed Browser Account Creation Sketch

This is the smallest confirmed shape from installed SDK types and implementation. It is not wired into the UI yet.

```ts
const {
  AccountType,
  AuthSecretKey,
  StorageMap,
  StorageMode,
  StorageSlot,
} = await import("@miden-sdk/miden-sdk");

const registryMap = new StorageMap();
const registrySlot = StorageSlot.map("mns::names", registryMap);

const registryComponent = await client.compile.component({
  code: MINIMAL_REGISTRY_COMPONENT_SOURCE,
  slots: [registrySlot],
  supportAllTypes: true,
});

const seed = crypto.getRandomValues(new Uint8Array(32));
const auth = AuthSecretKey.rpoFalconWithRNG();

const registryAccount = await client.accounts.create({
  type: AccountType.RegularAccountUpdatableCode,
  seed,
  auth,
  components: [registryComponent],
  storage: StorageMode.Public,
});
```

This creates a local Miden contract account in the browser client store.

To make the account visible onchain, the account must participate in a
confirmed transaction. The current browser smoke test submits a minimal script
from the newly created registry account and waits for confirmation:

```ts
const publishScript = await client.compile.txScript({
  code: "begin push.1 drop end",
});

const publishResult = await client.transactions.execute({
  account: registryAccount,
  script: publishScript,
  waitForConfirmation: true,
  timeout: 120_000,
});

await client.sync();
```

The app stores the resulting registry account id in browser local storage so
the existing Register transaction path targets the published account without
changing the transaction builder. For a durable environment config, copy the
reported value into:

```env
NEXT_PUBLIC_MIDEN_REGISTRY_ACCOUNT_ID=<published-registry-account-id>
```

## What Is Still Missing

- Exact transaction request shape for invoking the registry account's `register` procedure.
- Confirmed MASM syntax for reading from and writing to the `mns::names` `StorageMap` inside a v0.14 `pub proc` account component.
- Stable encoding from `name.miden` to `nameHash: Word`.
- Stable encoding from wallet account/address to `owner: Word`.
- Decision on who owns registry account auth:
  - A singleton registry account likely needs deployer-controlled auth or governance.
  - User wallet auth should register names by invoking registry logic, not by owning the registry account itself.
- Frontend registry config:
  - deployed registry account id
  - procedure hash/name for `register`
  - procedure hash/name for `resolve`
  - network/RPC target

## React SDK Note

The React signer provider path supports adding `customComponents` to a user account configuration. That is useful for extending a user's own account, but it is not the same thing as deploying a singleton Miden Name Service registry account.

For the registry, the safer path is:

1. Keep compiling the registry component in the browser.
2. Create a local mutable contract account with `client.accounts.create(...)`.
3. Submit a minimal transaction from that account and wait for confirmation.
4. Only then wire the frontend register flow to invoke the deployed registry account.

## Next Safe Implementation Step

Implemented as a dev-only smoke test panel named `Create registry account`.
It calls `client.accounts.create(...)` with the already compiled registry
component, submits a minimal publish transaction, syncs, and reports:

- created account id
- publish transaction id
- storage mode
- component procedure hashes
- exact error if account creation fails

The browser session also stores the published registry account id as the active
registry target. To persist it across environments, copy the reported id into
`NEXT_PUBLIC_MIDEN_REGISTRY_ACCOUNT_ID`.
