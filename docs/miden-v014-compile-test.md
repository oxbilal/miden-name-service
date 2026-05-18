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

`CompileComponentOptions.slots` is optional, so the first registry test
intentionally uses no storage slots. This keeps the test focused on whether the
SDK can compile a minimal account component in the browser.

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
empty `register` and `resolve` procedures without storage:

```masm
#! Minimal registry component compile smoke test.
pub proc ping
    push.1
end

pub proc register
end

pub proc resolve
end
```

Required format for this smoke test:

- component procedures use `pub proc <name>`
- each exported procedure ends with `end`
- transaction script `begin`/`end` format is not used for component compile
- `register` and `resolve` are empty for now
- this registry test does not include `StorageMap` slots, account deploy, or
  storage writes

Legacy dotted MASM forms, such as `export.register`, fail in v0.14 with:

```text
Failed to compile account component: invalid syntax
```

## What This Does Not Do

- It does not deploy a mutable contract account.
- It does not create a registry account.
- It does not send a wallet transaction.
- It does not write `nameHash -> owner` storage.

## If The Browser Compile Fails

The panel shows the exact error returned by the SDK. Copy that error into this
document before changing the MASM or moving to registry storage.

No compile error is recorded here yet. `npm run build` passes because this test
is browser-triggered and does not run during Next.js prerender.
