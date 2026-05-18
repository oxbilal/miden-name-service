# Miden Name Service Registry Contract Scaffold

This folder contains the first Miden Assembly scaffold for the future Miden Name
Service registry account.

The scaffold follows the official Miden mapping example for account
`StorageMap` reads and writes. The app is wired to stop at a clear blocker until
the registry account is deployed and the frontend transaction argument encoding
is confirmed.

## SDK APIs Confirmed Locally

The active app path is Miden v0.14 through `@miden-sdk/*`. The old
`@demox-labs/*` SDK notes are superseded by `docs/miden-v014-migration.md`.

Confirmed v0.14 APIs include:

- `MidenClient.createTestnet()`
- `client.compile.component({ code, slots?, supportAllTypes? })`
- `client.compile.txScript({ code, libraries? })`
- `AccountType.ImmutableContract`
- `AccountType.MutableContract`

These APIs are enough to define the next compile experiment, but this repo does
not yet include an executable registry deploy script.

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
