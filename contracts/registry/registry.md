# Registry Pseudocode

This file sketches the intended behavior for the future Miden registry
account/contract. It is not executable code yet.

## State

```ts
type NameRecord = {
  name: string;
  owner: AccountId;
  target: AccountId;
  createdAt: BlockHeight;
  updatedAt: BlockHeight;
};

registry: Map<NameKey, NameRecord>;
```

`NameKey` should be derived from the normalized lowercase `.miden` name.

## `register(name, owner)`

```ts
function register(name: string, owner: AccountId) {
  const normalizedName = normalizeName(name);
  const key = nameToRegistryKey(normalizedName);

  assert(isValidName(normalizedName), "invalid name");
  assert(registry.get(key) == null, "name already registered");
  assert(callerAccountId() == owner, "owner must be caller");

  registry.set(key, {
    name: normalizedName,
    owner,
    target: owner,
    createdAt: currentBlockHeight(),
    updatedAt: currentBlockHeight(),
  });
}
```

## `resolve(name)`

```ts
function resolve(name: string): AccountId | null {
  const normalizedName = normalizeName(name);
  const key = nameToRegistryKey(normalizedName);
  const record = registry.get(key);

  if (record == null) {
    return null;
  }

  return record.target;
}
```

## `transfer(name, newOwner)`

```ts
function transfer(name: string, newOwner: AccountId) {
  const normalizedName = normalizeName(name);
  const key = nameToRegistryKey(normalizedName);
  const record = registry.get(key);

  assert(record != null, "name not registered");
  assert(callerAccountId() == record.owner, "caller is not owner");
  assert(isValidAccountId(newOwner), "invalid new owner");

  registry.set(key, {
    ...record,
    owner: newOwner,
    updatedAt: currentBlockHeight(),
  });
}
```

## `updateTarget(name, target)`

```ts
function updateTarget(name: string, target: AccountId) {
  const normalizedName = normalizeName(name);
  const key = nameToRegistryKey(normalizedName);
  const record = registry.get(key);

  assert(record != null, "name not registered");
  assert(callerAccountId() == record.owner, "caller is not owner");
  assert(isValidAccountId(target), "invalid target");

  registry.set(key, {
    ...record,
    target,
    updatedAt: currentBlockHeight(),
  });
}
```

## Notes

- `callerAccountId()` represents the authenticated account executing the Miden
  transaction.
- `currentBlockHeight()` is a placeholder for the final chain time source.
- `nameToRegistryKey()` must match frontend/test encoding exactly.
- This contract should not create names from frontend mock state directly; the
  frontend will eventually submit a real Miden transaction for registration.
