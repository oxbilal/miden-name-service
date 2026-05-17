# Registry Deploy Checklist

This checklist describes the exact next steps to move Miden Name Service from
the current registry scaffold to a deployed registry account that the frontend
can request transactions against.

It does not claim the registry is complete.

## Files Ready Now

- `contracts/registry/src/registry.masm`
  - MASM account component scaffold.
  - Uses the official mapping pattern:
    - `native_account::set_map_item`
    - `active_account::get_map_item`
  - Exposes:
    - `register(nameHash, owner)`
    - `resolve(nameHash)`
    - `get_registry_root()`

- `contracts/registry/src/register_name.masm`
  - Transaction script scaffold for calling `registry::register`.

- `lib/registryContract.ts`
  - Frontend registry transaction boundary.
  - Currently blocks with an exact error instead of sending an empty transaction.

- `app/page.tsx`
  - Register no longer mock-saves.
  - Register routes through `createRegistryRegisterTransaction(...)`.

- `docs/registry-contract-blocker.md`
  - Documents the current missing APIs/config.

- `docs/custom-transaction-api.md`
  - Documents wallet adapter `CustomTransaction` and `requestTransaction` APIs.

## MASM / Contract Parts Still Placeholder

- `registry.masm` uses confirmed map read/write procedure names, but it has not
  been compiled in this repo yet.
- `register(nameHash, owner)` currently writes whatever `owner Word` it receives.
  It does not yet:
  - verify caller ownership
  - reject duplicate registrations
  - enforce payment or fees
  - store target separately from owner
  - emit a structured event/note
  - validate name format

- `resolve(nameHash)` returns one `Word` owner value only.
- `register_name.masm` does not yet push real `NAME_HASH` or `OWNER` values.
  Those must be passed through a confirmed transaction argument mechanism.
- No registry account deployment script exists yet.
- No browser test proves that the wallet extension accepts the final registry
  `CustomTransaction`.

## Build / Deploy Registry Account

The installed SDK exposes the pieces needed for a likely browser build path:

```ts
const client = await WebClient.createClient();
const scriptBuilder = client.createScriptBuilder();

const component = AccountComponent.compile(
  registryMasmSource,
  scriptBuilder,
  [
    StorageSlot.emptyValue(),
    StorageSlot.map(new StorageMap()),
  ],
).withSupportsAllTypes();

const result = new AccountBuilder(seed)
  .storageMode(AccountStorageMode.public())
  .withComponent(component)
  .withNoAuthComponent()
  .build();

await client.newAccount(result.account, false);
```

Before adding this to the app, confirm:

- Whether the browser SDK should deploy the registry account or whether the
  Miden CLI should deploy it.
- The correct `AccountType` for a public immutable registry account.
- Whether `withNoAuthComponent()` is appropriate for public callable registry
  methods, or whether a dedicated auth/access component is needed.
- Whether `withSupportsAllTypes()` is required for the registry component.
- How the deployed account id is exported and persisted.

## Frontend Config Needed

The frontend needs one public config value:

```env
NEXT_PUBLIC_MIDEN_REGISTRY_ACCOUNT_ID=<deployed-registry-account-id>
```

`lib/registryContract.ts` already checks this variable. Today, even if it is
set, the function still blocks because the transaction script inputs and foreign
account requirements are not confirmed.

## Register Flow Once Deployed

Once deployment and argument encoding are confirmed, `Register name` should:

1. Normalize the selected `.miden` name.
2. Hash the normalized name into a Miden `Word`:
   - `nameHash: Word`
3. Convert the connected wallet account id/address into an owner `Word`:
   - `owner: Word`
4. Compile or load `contracts/registry/src/register_name.masm`.
5. Link the registry account/component library for `use.miden_name_service::registry`.
6. Add the deployed registry account as a foreign account if the SDK requires it:
   - `ForeignAccount.public(registryAccountId, storageRequirements)`
7. Build a non-empty `TransactionRequest` with:
   - custom script
   - nameHash argument
   - owner argument
   - registry foreign account/reference
8. Wrap it with:

```ts
Transaction.createCustomTransaction(
  walletAccountId,
  registryAccountId,
  transactionRequest,
)
```

9. Call:

```ts
await requestTransaction(transaction);
```

10. Show the returned transaction id/status.
11. Refresh registry state and resolve the registered name from the deployed
    registry account storage.

## Exact Remaining Blockers

- Confirm name-to-`Word` hashing.
- Confirm account-id/address-to-`Word` owner encoding.
- Confirm transaction script argument passing for two `Word` values.
- Confirm `ForeignAccount` storage requirements for the registry storage slot.
- Confirm deployed registry account id persistence.
- Confirm wallet extension behavior for a non-empty custom registry transaction.
