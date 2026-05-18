# Registry Build Notes

## Current SDK Path

The active SDK path is Miden v0.14:

- `@miden-sdk/miden-sdk`
- `@miden-sdk/react`
- `@miden-sdk/miden-wallet-adapter-react`

The old `@demox-labs/*` package path and direct `WebClient.createClient()`
flow are superseded for this app.

## Confirmed v0.14 APIs

Found in `node_modules/@miden-sdk/miden-sdk/dist/st/api-types.d.ts`:

- `MidenClient.createTestnet()`
- `MidenClient.ready()`
- `client.compile.component({ code, slots?, supportAllTypes? })`
- `client.compile.txScript({ code, libraries? })`
- `client.transactions.consume({ account, notes })`
- `AccountType.ImmutableContract`
- `AccountType.MutableContract`

Found in `node_modules/@miden-sdk/react/dist/lazy.d.ts`:

- `MidenProvider`
- `useMidenClient`
- `useSigner`
- `useAccount`
- `useSend`
- `useTransaction`
- `useCompile`

## MASM Scaffold Added

`src/registry.masm` is the placeholder account component scaffold:

- `native_account::set_map_item` writes `nameHash -> owner` into storage slot 1.
- `active_account::get_map_item` resolves `nameHash` from storage slot 1.
- `src/register_name.masm` is the transaction script scaffold for calling
  `register`.

## Build Path To Confirm

The smallest confirmed browser-side compile shape is:

```ts
const component = await client.compile.component({
  code: registryMasmSource,
  slots,
  supportAllTypes: true,
});
```

Before adding a registry build or deploy script, confirm:

- exact `StorageMap` slot construction in v0.14
- whether the registry should be `AccountType.ImmutableContract` or
  `AccountType.MutableContract`
- official account creation/deploy/import flow for a custom contract account
- transaction script argument encoding for `nameHash`, owner, and target
- foreign registry account requirements for wallet-originated transactions

## Current Status

The frontend Register action intentionally blocks before registry write. The
repo should not send an empty transaction as final behavior.
