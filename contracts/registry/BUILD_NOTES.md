# Registry Build Notes

## What The Current SDK Supports

The installed `@demox-labs/miden-sdk` package includes browser/WebClient APIs
that appear relevant for a registry account/component build path:

- `WebClient.createScriptBuilder()`
- `ScriptBuilder.buildLibrary(library_path, source_code)`
- `ScriptBuilder.compileTxScript(tx_script)`
- `AccountComponent.compile(account_code, builder, storage_slots)`
- `AccountComponent.fromPackage(package, storage_slots)`
- `AccountBuilder.withComponent(account_component)`
- `AccountBuilder.build()`
- `WebClient.newAccount(account, overwrite)`
- `TransactionRequestBuilder.withCustomScript(script)`
- `WebClient.executeTransaction(account_id, transaction_request)`
- `WebClient.submitNewTransaction(account_id, transaction_request)`

These names come from
`node_modules/@demox-labs/miden-sdk/dist/crates/miden_client_web.d.ts`.

## MASM Scaffold Added

`src/registry.masm` now follows the official Miden mapping example:

- `native_account::set_map_item` writes `nameHash -> owner` into storage slot 1.
- `active_account::get_map_item` resolves `nameHash` from storage slot 1.
- `src/register_name.masm` is a transaction script scaffold for calling
  `register`.

## Why This Is Not Fully Buildable Yet

This repo now has MASM scaffolding, but it still does not have enough confirmed
browser-side tooling to produce a real wallet registry transaction. Missing
pieces:

- A build script that reads contract source and calls `AccountComponent.compile`.
- A local test harness that creates the registry account with `AccountBuilder`.
- Confirmed `nameHash Word` encoding from normalized `.miden` names.
- Confirmed owner account id to `Word` encoding.
- Confirmed `ForeignAccount` storage requirements for calling the public
  registry account from a wallet-originated transaction.
- A known registry account deployment/import workflow.

Because those pieces are not present, the frontend Register action intentionally
does not send an empty custom transaction.

## Expected Build Path

Once the missing pieces are confirmed, the registry build should look like:

1. Create a `WebClient`.
2. Call `client.createScriptBuilder()`.
3. Load registry account source from `contracts/registry/src`.
4. Define storage slots for the registry map.
5. Call `AccountComponent.compile(accountCode, builder, storageSlots)`.
6. Attach the component to an `AccountBuilder`.
7. Build the registry account.
8. Persist it with `client.newAccount(account, overwrite)`.
9. Save the registry account id for frontend use.

## Build Command Placeholder

No build command is available yet.

I checked `node_modules/.bin` and the current environment for `miden` and
`miden-client`; neither command is installed. I also tried compiling
`src/registry.masm` directly with the installed npm SDK from Node, but the SDK's
generated WASM loader failed before MASM compilation with `TypeError: fetch
failed`.

See `docs/registry-build-blocker.md` for the exact command attempted and the
missing official build/deploy runner.

When the build script exists, add one of these:

```json
{
  "scripts": {
    "build:registry": "tsx scripts/buildRegistry.ts"
  }
}
```

or keep it as a standalone script under `scripts/` if registry deployment should
not be part of normal frontend development.
