# Miden v0.14 Migration

This project has been migrated away from the old `@demox-labs/*` browser
`WebClient` flow and now targets the Miden v0.14 package path.

## Installed packages

Confirmed in `package.json` and `node_modules`:

- `@miden-sdk/miden-sdk@0.14.9`
- `@miden-sdk/react@0.14.9`
- `@miden-sdk/miden-wallet-adapter-react@0.14.3`
- `@miden-sdk/miden-wallet-adapter-base@0.14.3` via the wallet adapter package

The old `@demox-labs/miden-sdk` and `@demox-labs/miden-wallet-adapter`
dependencies were removed from the app.

## App provider path

The app loads the Miden-backed UI behind a client-only dynamic boundary because
the v0.14 WASM package should not be imported during Next.js server prerender.

- `app/page.tsx`: route entry and client loader only.
- `app/page-client-loader.tsx`: `next/dynamic(..., { ssr: false })`.
- `app/miden-name-service-app.tsx`: wraps the UI in providers.
- `app/miden-name-service-client.tsx`: main interactive UI.

The provider tree is:

```tsx
import { MidenProvider } from "@miden-sdk/react";
import { MidenFiSignerProvider } from "@miden-sdk/miden-wallet-adapter-react";

<MidenFiSignerProvider appName="Miden Name Service" autoConnect>
  <MidenProvider config={{ rpcUrl: "testnet", prover: "testnet" }}>
    {children}
  </MidenProvider>
</MidenFiSignerProvider>
```

Wallet connection is read from `useMidenFiWallet()`. The unified signer bridge is
available through `useSigner()`.

## Confirmed React SDK hooks

Found in `node_modules/@miden-sdk/react/dist/index.d.ts`:

- `MidenProvider`
- `useMiden`
- `useMidenClient`
- `useSigner`
- `useAccount`
- `useAccounts`
- `useSend`
- `useTransaction`
- `useCompile`
- `useConsume`
- `useExecuteProgram`

For this migration, the UI uses `useSigner()` and `useMidenFiWallet()` only.
`useAccount`, `useSend`, `useTransaction`, and `useCompile` are documented next
steps, not registry-write code.

## Confirmed client APIs

Found in `node_modules/@miden-sdk/miden-sdk/dist/st/api-types.d.ts`:

```ts
MidenClient.create(options?)
MidenClient.createTestnet(options?)
MidenClient.createDevnet(options?)
MidenClient.createMock(options?)
MidenClient.ready()
```

The wrapper exposes:

```ts
client.accounts.list()
client.accounts.get(accountId)
client.accounts.create()
client.transactions.consume({ account, notes })
client.compile.component({ code, slots?, supportAllTypes? })
client.compile.txScript({ code, libraries? })
client.compile.noteScript({ code, libraries? })
```

The browser helper in `lib/midenClient.ts` now dynamically imports the confirmed
package root export, `@miden-sdk/miden-sdk`, and creates a `MidenClient` with
`MidenClient.createTestnet()`. The import stays inside a `typeof window` guarded
function so Next.js SSR does not import the WASM-backed SDK during prerender.

## Contract account types

Found in the v0.14 SDK declarations:

```ts
AccountType.ImmutableContract
AccountType.MutableContract
```

These are the account types we should use for the registry account once the
contract component compile and deployment path is confirmed.

## Registry status

Registry/register is still not implemented onchain. The confirmed next API to
test is:

```ts
const component = await client.compile.component({
  code: registryMasmSource,
  slots,
  supportAllTypes: true,
});
```

That first compile test now exists in `lib/midenCompileTest.ts` and the
`Registry Component Compile Test` panel. It currently compiles a minimal
component with `pub proc ping`, `pub proc register`, and `pub proc resolve`
while we prove the exact browser compile syntax. Empty procedures fail, so
`register` now consumes placeholder `NAME_HASH` and `OWNER`
words, and `resolve` consumes placeholder `NAME_HASH` and returns a placeholder
owner word. It does not deploy an account or write registry storage.

The first storage compile step now supplies one empty named `StorageMap` slot
from TypeScript with:

```ts
const registryMap = new StorageMap();
const registryMapSlot = StorageSlot.map("mns::names", registryMap);
await client.compile.component({ code, slots: [registryMapSlot] });
```

This confirms storage slot construction for `client.compile.component`, but not
MASM read/write instructions inside `register` or `resolve`.

The test uses `AccountType.RegularAccountUpdatableCode = 3` from the installed
lazy WASM export. The wrapper docs mention `MutableContract`, but the lazy
runtime type does not expose that alias directly.

Do not wire a registry write until we have confirmed:

- valid MASM component syntax for `register(nameHash, owner)` and `resolve(nameHash)`
- exact `StorageMap` slot creation for v0.14
- registry account creation using `ImmutableContract` or `MutableContract`
- transaction script argument encoding for `nameHash`, owner, and target
- wallet `requestTransaction(CustomTransaction)` behavior with the compiled
  script and foreign registry account requirements

## Superseded docs

Older docs that mention `@demox-labs/*` or `WebClient` are historical research
notes from the v0.12 flow. Treat this document as the current source of truth
for app integration and future registry work.
