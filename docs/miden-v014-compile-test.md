# Miden v0.14 Compile Test

This repo now includes a browser-only dev panel for the first confirmed v0.14
compile path.

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

`CompileComponentOptions.slots` is optional, so the first test intentionally
uses no storage slots. This keeps the test focused on whether the SDK can compile
a minimal account component in the browser.

Note: the higher-level wrapper declarations mention a `MutableContract` alias,
but the installed lazy WASM export type exposes the underlying account enum as
`RegularAccountUpdatableCode = 3`. The panel uses that confirmed export and
treats it as the mutable-contract-equivalent value for this compile smoke test.

## Files

- `lib/midenCompileTest.ts`
  - exports `compileMinimalMutableContract(client)`
  - imports `AccountType` dynamically from `@miden-sdk/miden-sdk/lazy`
  - calls `client.compile.component(...)`
  - returns procedure count, procedure names, and `ping` procedure hash when
    available

- `app/miden-name-service-client.tsx`
  - adds the `MutableContract Compile Test` panel
  - displays exact thrown errors in the UI
  - does not connect this to Register

## What This Does Not Do

- It does not deploy a `MutableContract` account.
- It does not create a registry account.
- It does not send a wallet transaction.
- It does not write `nameHash -> owner` storage.

## If The Browser Compile Fails

The panel shows the exact error returned by the SDK. Copy that error into this
document before changing the MASM or moving to registry storage.

No compile error is recorded here yet. `npm run build` passes because this test
is browser-triggered and does not run during Next.js prerender.
