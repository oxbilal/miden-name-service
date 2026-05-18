# Registry Account Procedure Scaffold

This is the contract-facing scaffold for the Miden Name Service registry. It is
not executable Miden Assembly yet.

The installed SDK exposes `AccountComponent.compile(account_code, builder,
storage_slots)`, but this repo does not yet include confirmed account component
source syntax or a build script. Keep this file as the source-of-truth behavior
until the executable component is written.

## Component Procedures

### `register(name, owner)`

Inputs:

- `name`: normalized `.miden` name encoded as the agreed registry key.
- `owner`: caller account id.

Checks:

- Name key is valid.
- Name key does not already exist in registry storage.
- Transaction caller matches `owner`.

Writes:

- `owner`
- `target`, initially equal to `owner`
- `createdAt`
- `updatedAt`

### `resolve(name)`

Inputs:

- `name`: normalized `.miden` name encoded as the agreed registry key.

Reads:

- Registry record for `name`.

Returns:

- `target` account id when found.
- Empty/not-found result when absent.

### `transfer(name, newOwner)`

Inputs:

- `name`: normalized `.miden` name encoded as the agreed registry key.
- `newOwner`: account id that will own the name.

Checks:

- Name key exists.
- Transaction caller matches the current owner.
- `newOwner` is a valid account id.

Writes:

- `owner = newOwner`
- `updatedAt`

### `updateTarget(name, target)`

Inputs:

- `name`: normalized `.miden` name encoded as the agreed registry key.
- `target`: account id returned by future `resolve(name)` calls.

Checks:

- Name key exists.
- Transaction caller matches the current owner.
- `target` is a valid account id.

Writes:

- `target`
- `updatedAt`

## Transaction Integration Later

The frontend should not call these procedures directly from `app/page.tsx`.
Instead, future code should add `lib/registryClient.ts` with wrappers such as:

- `registerName(client, params)`
- `resolveName(client, name)`
- `transferName(client, params)`
- `updateNameTarget(client, params)`

Those wrappers should build Miden transaction requests and submit them with the
connected `MidenClient`.
