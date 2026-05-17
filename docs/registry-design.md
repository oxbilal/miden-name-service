# Miden Name Service Registry Design

## Purpose

The Miden Name Service registry maps readable `.miden` names to Miden account
owners and target account identifiers. The current app is a frontend MVP; this
document describes the intended registry layer that should replace the mock
React state later.

## Registry Data

Each registered name should store:

- `name`: canonical lowercase `.miden` name, such as `alpha.miden`.
- `owner`: Miden account id that controls the name.
- `target`: Miden account id that the name resolves to.
- `createdAt`: block height or timestamp when the name was registered.
- `updatedAt`: block height or timestamp of the latest registry update.

The registry should enforce one active record per name.

## Operations

### `register(name, owner)`

Creates a new registry record for an available name.

Rules:

- `name` must be valid and normalized.
- `name` must not already exist.
- `owner` must be the authenticated Miden account creating the registration.
- Initial `target` can default to `owner`.

Result:

- Stores `{ name, owner, target: owner }`.
- Emits or records a registration event if supported by the contract model.

### `resolve(name)`

Returns the target account id for a registered name.

Rules:

- `name` must be normalized before lookup.
- Missing names should return an empty result or a clear not-found error.

Result:

- Returns `target`.

### `transfer(name, newOwner)`

Transfers ownership of a name to another Miden account.

Rules:

- Caller must be the current `owner`.
- `newOwner` must be a valid Miden account id.
- The `target` can remain unchanged unless explicitly updated.

Result:

- Updates `owner`.
- Updates `updatedAt`.

### `updateTarget(name, target)`

Updates the account id returned by `resolve(name)`.

Rules:

- Caller must be the current `owner`.
- `target` must be a valid Miden account id.

Result:

- Updates `target`.
- Updates `updatedAt`.

## What Is Still Mock

The current frontend still uses local React state for:

- Name availability checks.
- Registered name records in `My Names`.
- Registering names after search.
- Copy feedback.

The app can create or load a local Miden SDK account and show its account id,
but name registration does not yet write to a Miden registry account or contract.

## Next Step

Build a Miden registry account/contract that implements:

- `register(name, owner)`
- `resolve(name)`
- `transfer(name, newOwner)`
- `updateTarget(name, target)`

After that, replace the mock React registration write with a real call to the
registry account/contract and read name availability from registry state.
