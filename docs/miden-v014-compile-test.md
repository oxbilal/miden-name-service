# Miden v0.14 Compile Test

This repo includes a browser-only dev panel for the first confirmed v0.14
component compile path.

## Confirmed API

From `node_modules/@miden-sdk/miden-sdk/dist/st/api-types.d.ts`:

```ts
client.compile.component({
  code,
  slots?,
  supportAllTypes?,
})

AccountType.RegularAccountUpdatableCode
```

`CompileComponentOptions.slots` accepts `StorageSlot[]`. The first registry
storage test uses the confirmed TypeScript-side storage constructors from the
installed SDK:

```ts
const registryMap = new StorageMap();
const registryMapSlot = StorageSlot.map("mns::names", registryMap);

await client.compile.component({
  code,
  slots: [registryMapSlot],
  supportAllTypes: true,
});
```

This proves that the browser compile path can accept a named empty
`StorageMap` slot for the future registry map. It does not yet prove MASM
storage read/write instructions.

Note: the higher-level wrapper declarations mention a `MutableContract` alias,
but the installed lazy WASM export type exposes the underlying account enum as
`RegularAccountUpdatableCode = 3`. The panel uses that confirmed export and
treats it as the mutable-contract-equivalent value for this compile smoke test.

## Files

- `lib/midenCompileTest.ts`
  - exports `compileMinimalMutableContract(client)`
  - exports `compileMinimalRegistryComponent(client)`
  - imports `AccountType` dynamically from the confirmed package root export,
    `@miden-sdk/miden-sdk`
  - calls `client.compile.component(...)`
  - returns procedure count, procedure names, and procedure hashes when available

- `app/miden-name-service-client.tsx`
  - adds the `Registry Component Compile Test` panel
  - displays exact thrown errors in the UI
  - does not connect this to Register

## Minimal Component Format

I inspected the installed `@miden-sdk/miden-sdk` and `@miden-sdk/react`
packages for a complete `client.compile.component` source example. The package
declares the API but does not include a complete component source fixture.

The official MASM code organization docs show that library modules export
procedures with `pub proc`. After proving `ping`, the registry compile test adds
safe stack handling for `register` and `resolve`. Storage is supplied as an
empty SDK `StorageMap` slot, but the procedures do not read or write it yet:

```masm
#! Minimal registry component compile smoke test.
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
```

Required format for this smoke test:

- component procedures use `pub proc <name>`
- each exported procedure ends with `end`
- transaction script `begin`/`end` format is not used for component compile
- empty `pub proc` bodies fail with invalid syntax
- `register` consumes two placeholder words, `NAME_HASH` and `OWNER`
- `resolve` consumes one placeholder `NAME_HASH` word and returns a placeholder
  owner word
- this registry test includes one empty `StorageMap` slot named `mns::names`
- this registry test does not include account deploy or storage writes

Legacy dotted MASM forms, such as `export.register`, fail in v0.14 with:

```text
Failed to compile account component: invalid syntax
```

## What This Does Not Do

- It does not deploy a mutable contract account.
- It does not create a registry account.
- It does not send a wallet transaction.
- It does not write `nameHash -> owner` storage.
- It does not call MASM storage read/write instructions yet.

## Storage Syntax Status

Confirmed from installed v0.14 SDK types:

- `StorageMap` has `constructor()` and `insert(key: Word, value: Word): Word`
- `StorageSlot.map(name: string, storage_map: StorageMap): StorageSlot`
- `client.compile.component({ code, slots, supportAllTypes })`

Not confirmed in the installed package examples/tests:

- a v0.14 MASM component source fixture that calls a storage read instruction
- a v0.14 MASM component source fixture that calls a storage write instruction

The existing legacy scaffold in `contracts/registry/src/registry.masm` mentions
`native_account::set_map_item` and `active_account::get_map_item`, but that file
uses older `export.*` procedure syntax. Since `export.*` already fails
`client.compile.component` with `invalid syntax`, those storage calls are not
treated as confirmed for this v0.14 browser compile path.

## If The Browser Compile Fails

The panel shows the exact error returned by the SDK. Copy that error into this
document before changing the MASM or moving to registry storage.

No compile error is recorded here yet. `npm run build` passes because this test
is browser-triggered and does not run during Next.js prerender.
