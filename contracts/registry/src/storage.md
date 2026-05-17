# Registry Storage Scaffold

This file defines the proposed storage model for the registry account. Exact
Miden storage slot code is not written yet because the repo does not currently
include confirmed storage slot construction for account components.

## Proposed Logical Model

```ts
type RegistryRecord = {
  owner: AccountId;
  target: AccountId;
  createdAt: BlockHeight;
  updatedAt: BlockHeight;
};

type RegistryStorage = Map<NameKey, RegistryRecord>;
```

## Name Key

`NameKey` must be deterministic and shared by:

- UI validation.
- Registry transaction client.
- Contract tests.
- Registry account component.

Proposed path:

1. Normalize to lowercase `.miden`.
2. Reject names outside `[a-z0-9-]`.
3. Convert the normalized name into field elements or a digest.
4. Use that digest as the map key.

The exact digest/word encoding must be chosen before executable contract code is
written.

## Record Fields

- `owner`: account id allowed to transfer or update the name.
- `target`: account id returned by `resolve(name)`.
- `createdAt`: block height or timestamp at registration.
- `updatedAt`: block height or timestamp at latest owner/target change.

## Open Questions

- Which Miden storage map/slot primitive should hold the registry map?
- How should a variable-length name be encoded into the key?
- Should `createdAt` and `updatedAt` use block height, timestamp, or a registry
  nonce?
- Should `resolve(name)` be exposed as a readonly procedure, an offchain store
  read, or both?
- Should the registry support expiry or renewal later?
