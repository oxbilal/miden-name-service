# Miden v0.14 Compile Test

This repo includes browser-only dev panels for the first confirmed v0.14
component compile path and the smallest registry-shaped component compile test.

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
  - imports `AccountType` dynamically from `@miden-sdk/miden-sdk/lazy`
  - calls `client.compile.component(...)`
  - returns procedure count, procedure names, and procedure hashes when available

- `app/miden-name-service-client.tsx`
  - adds the `Registry Component Compile Test` panel
  - displays exact thrown errors in the UI
  - does not connect this to Register

## Minimal Registry Component Format

The smallest registry compile test uses an account component source, not a
transaction script:

```masm
export.register
    dropw
    dropw
end

export.resolve
    dropw
    push.0.0.0.0
end
```

Required format confirmed by this test:

- component procedures use `export.<name>`
- each exported procedure ends with `end`
- transaction script `begin`/`end` format is not used for component compile
- `register` accepts the future stack shape `[NAME_HASH, OWNER]`
- `resolve` accepts `[NAME_HASH]` and returns a placeholder owner word
- this first registry test does not include `StorageMap` slots or storage writes

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
