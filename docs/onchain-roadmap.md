# Miden Name Service Onchain Roadmap

## Goal

Move Miden Name Service from local React mock state to a real Miden registry
account/contract. The frontend should still feel the same, but `register`,
`resolve`, `transfer`, and `updateTarget` should eventually read from and write
to registry state through Miden SDK transactions.

## Files Needed Next

### `contracts/registry/`

Holds the registry account/contract source.

Expected files:

- `contracts/registry/README.md`: contract notes, storage layout, and local
  build/run instructions.
- `contracts/registry/registry.masm`: Miden assembly module for registry
  procedures.
- `contracts/registry/storage.md`: exact storage slot/map layout for name
  records.
- `contracts/registry/tests/registry.test.ts`: integration tests that create a
  registry account and exercise register/resolve/update/transfer behavior.

### `lib/registryClient.ts`

Frontend-facing wrapper around the Miden SDK registry calls.

Expected exports:

- `getRegistryAccountId()`
- `registerName(client, params)`
- `resolveName(client, name)`
- `transferName(client, params)`
- `updateNameTarget(client, params)`

This file should keep SDK-specific transaction construction out of
`app/page.tsx`.

### `lib/nameEncoding.ts`

Shared helpers for converting readable names into the registry storage key.

Expected exports:

- `normalizeMidenName(name)`
- `validateMidenName(name)`
- `nameToRegistryKey(name)`

The frontend already has normalization/validation logic, but the onchain path
needs a single shared encoding rule so the UI, tests, and contract agree.

### `scripts/deployRegistry.ts`

Creates or imports the registry account in a local/dev Miden environment.

Expected behavior:

- Create the registry account with the registry component attached.
- Print the registry account id.
- Write a local `.env.local` value such as `NEXT_PUBLIC_MNS_REGISTRY_ACCOUNT_ID`
  if we decide to make the account configurable.

### `docs/registry-transaction-flow.md`

Documents the final SDK transaction flow once the registry exists.

Expected content:

- How user account id is loaded.
- How registry account id is loaded.
- How transaction request inputs are encoded.
- How errors map back into UI messages.

## Registry Storage Shape

The registry should store one active record per canonical `.miden` name:

- `name`: normalized lowercase name, for example `alpha.miden`.
- `owner`: account id that controls the name.
- `target`: account id returned by `resolve(name)`.
- `createdAt`: block height or timestamp.
- `updatedAt`: block height or timestamp.

The storage key should be derived deterministically from the normalized name,
not from the raw user input. For example, `Alpha`, `alpha`, and `alpha.miden`
should all map to the same canonical `alpha.miden` record only if the frontend
allows that normalization. The current MVP validation is stricter and requires
lowercase input.

## How `register(name, owner)` Becomes Real

Today, registration does this:

1. User searches a name.
2. User chooses an available result.
3. The app writes `{ name, address, status }` into local React state.

The real Miden flow should become:

1. User creates or loads a local Miden account with `WebClient`.
2. App resolves the registry account id.
3. App normalizes and validates `name`.
4. App encodes the name into the registry key.
5. App checks registry state to confirm the key is empty.
6. App builds a transaction request that calls registry `register(name, owner)`.
7. User account signs/authorizes the transaction through the Miden client.
8. App submits the transaction with `WebClient`.
9. App syncs or refreshes registry state.
10. UI updates `My Names` from registry state instead of local React state.

The `owner` argument should be the loaded user Miden account id. The initial
`target` should default to the same account id unless the user sets a different
target.

## Operation Mapping

### `register(name, owner)`

Onchain behavior:

- Reject invalid or non-normalized names.
- Reject names that already exist.
- Require the transaction caller to match `owner`.
- Store owner and target in registry state.

Frontend change later:

- Replace the mock `setMockNames(...)` write with `registerName(client, params)`.

### `resolve(name)`

Onchain behavior:

- Read registry state by normalized name key.
- Return target account id or not-found.

Frontend change later:

- Replace local availability checks with `resolveName(client, name)`.

### `transfer(name, newOwner)`

Onchain behavior:

- Require caller to be current owner.
- Update owner.
- Leave target unchanged unless updated separately.

Frontend change later:

- Add an owner action to `My Names`.

### `updateTarget(name, target)`

Onchain behavior:

- Require caller to be current owner.
- Update target account id.

Frontend change later:

- Add target editing for owned names.

## Still Mock For Now

These remain mock/local until the registry account/contract exists:

- Name availability.
- `My Names` records.
- Registering a name.
- Copy feedback.
- Transfer and target update flows.

The app can create or load a real local Miden account id, but no name registry
state is written onchain yet.

## Immediate Next Step

Build the registry account/contract skeleton under `contracts/registry/`, then
write tests for:

- Registering an available name.
- Rejecting a duplicate name.
- Resolving a registered name.
- Rejecting transfer/update from a non-owner.
- Updating target as owner.
