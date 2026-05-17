# Miden Name Service Registry Contract Scaffold

This folder contains the first Miden Assembly scaffold for the future Miden Name
Service registry account.

The scaffold follows the official Miden mapping example for account
`StorageMap` reads and writes. The app is wired to stop at a clear blocker until
the registry account is deployed and the frontend transaction argument encoding
is confirmed.

## SDK APIs Confirmed Locally

The installed `@demox-labs/miden-sdk` package exposes the following relevant
APIs in `node_modules/@demox-labs/miden-sdk/dist/crates/miden_client_web.d.ts`:

- `WebClient.createScriptBuilder()`
- `AccountComponent.compile(account_code, builder, storage_slots)`
- `AccountComponent.fromPackage(package, storage_slots)`
- `AccountBuilder.withComponent(account_component)`
- `AccountBuilder.build()`
- `WebClient.newAccount(account, overwrite)`
- `TransactionRequestBuilder.withCustomScript(script)`
- `WebClient.executeTransaction(account_id, transaction_request)`
- `WebClient.submitNewTransaction(account_id, transaction_request)`

These APIs are enough to outline a registry account build path, but this repo
does not yet include an executable Miden contract build script.

## Goal

The registry account should own the canonical mapping from `.miden` names to
Miden account ids.

Each record should eventually store:

- `name`: normalized `.miden` name.
- `owner`: Miden account id that controls the name.
- `target`: Miden account id returned by `resolve(name)`.
- `createdAt`: block height or timestamp.
- `updatedAt`: block height or timestamp.

## Planned Operations

- `register(name, owner)`: claim an available name.
- `resolve(name)`: return the target account id for a name.
- `transfer(name, newOwner)`: move ownership to another account.
- `updateTarget(name, target)`: change the account id a name resolves to.

## Scaffold Files

- `src/registry.masm`: Miden Assembly account component scaffold with
  `register(nameHash, owner)` and `resolve(nameHash)`.
- `src/register_name.masm`: transaction script scaffold for calling
  `register`.
- `src/registry.md`: contract-facing procedure scaffold.
- `src/storage.md`: proposed storage layout and open questions.
- `BUILD_NOTES.md`: build path, confirmed APIs, and missing pieces.

## Current Status

This is a scaffold only. The MASM source is based on official mapping syntax,
but no registry deployment script or wallet transaction request builder is
complete yet.

Next implementation step:

1. Define the registry storage layout.
2. Convert the scaffold in `src/registry.md` into a Miden account component.
3. Add tests for register, duplicate rejection, resolve, transfer, and target
   update.
4. Connect the frontend through `lib/registryClient.ts`.
