# Registry Build Blocker

This documents the current registry build status after migrating the app
research to Miden v0.14.

## Goal

Compile `contracts/registry/src/registry.masm` into a Miden account component
and deploy/import a registry contract account that can store
`nameHash -> owner`.

## Files Inspected

- `docs/registry-deploy-checklist.md`
- `docs/miden-v014-migration.md`
- `package.json`
- `node_modules/.bin`
- `node_modules/@miden-sdk/miden-sdk/package.json`
- `node_modules/@miden-sdk/miden-sdk/dist/st/api-types.d.ts`
- `contracts/registry/src/registry.masm`

## Confirmed Available v0.14 APIs

The installed `@miden-sdk/miden-sdk@0.14.9` exports:

```ts
MidenClient.createTestnet()
MidenClient.ready()
client.compile.component({ code, slots?, supportAllTypes? })
client.compile.txScript({ code, libraries? })
AccountType.ImmutableContract
AccountType.MutableContract
TransactionRequestBuilder
```

The React package exports:

```ts
MidenProvider
useMidenClient
useSigner
useAccount
useSend
useTransaction
useCompile
```

## What Is Still Missing

The package confirms a browser compile API, but the deployable registry path is
not complete yet because these pieces still need official confirmation in this
repo:

- exact v0.14 `StorageMap` slot construction for a registry component
- exact custom contract account creation flow using `ImmutableContract` or
  `MutableContract`
- whether registry compile/deploy belongs in the browser, a script, or
  `cargo-miden`
- transaction script argument encoding for `nameHash`, owner, and target
- foreign account/storage requirements needed by wallet `requestTransaction`

## CLI Status

No official Miden CLI binary is installed in `node_modules/.bin`. A separate
toolchain setup is tracked in `docs/miden-toolchain-setup.md`.

## Current Decision

Do not add a registry build script yet. The next safe step is a tiny browser-only
compile experiment using:

```ts
await client.compile.component({
  code: registryMasmSource,
  slots,
  supportAllTypes: true,
});
```

That experiment should stop at compile output. It should not create a registry
account, request a wallet transaction, or write registry storage until the
missing deployment and argument APIs are confirmed.
