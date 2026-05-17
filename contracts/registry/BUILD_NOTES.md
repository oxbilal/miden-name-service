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

## Why This Is Not Buildable Yet

This repo does not yet have enough confirmed contract tooling to build a real
registry account. Missing pieces:

- Confirmed Miden Assembly source syntax for account components.
- Confirmed storage slot declarations for a name registry map.
- A build script that reads contract source and calls `AccountComponent.compile`.
- A local test harness that creates the registry account with `AccountBuilder`.
- A transaction script format for calling registry procedures from a user
  account.
- A known registry account deployment/import workflow.

Because those pieces are not present, this scaffold intentionally avoids adding
an executable `.masm` file with guessed syntax.

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
