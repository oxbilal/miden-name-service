# Registry Contract Blocker

The repo now has a registry account/component scaffold in:

- `contracts/registry/src/registry.masm`
- `contracts/registry/src/register_name.masm`

The scaffold uses the official Miden mapping pattern:

- `native_account::set_map_item` writes to a `StorageMap`
- `active_account::get_map_item` reads from a `StorageMap`
- storage slot `1` is the registry map
- `register` stores `nameHash Word -> owner Word`
- `resolve` reads `nameHash Word -> owner Word`

Official source used:

- Miden mapping tutorial: https://miden.us.com/miden-tutorials/rust-client/mappings_in_masm_how_to/index
- Miden account storage docs: https://docs.miden.xyz/miden-base/account/storage/
- Installed SDK declarations: `node_modules/@demox-labs/miden-sdk/dist/crates/miden_client_web.d.ts`

## Confirmed Installed APIs

The installed SDK exposes:

```ts
client.createScriptBuilder()
AccountComponent.compile(accountCode, builder, storageSlots)
new StorageMap()
StorageSlot.emptyValue()
StorageSlot.map(storageMap)
new AccountBuilder(seed)
accountBuilder.storageMode(AccountStorageMode.public())
accountBuilder.withComponent(component)
accountBuilder.withNoAuthComponent()
client.newAccount(account, overwrite)
new TransactionRequestBuilder().withCustomScript(script).build()
```

The installed wallet adapter exposes:

```ts
requestTransaction(transaction: MidenTransaction): Promise<string>
Transaction.createCustomTransaction(address, recipientAddress, transactionRequest)
```

## Why Register Is Still Blocked

The Register button no longer sends an empty transaction and no longer mock-saves
the name. It now stops with an exact blocker because these pieces are still not
confirmed:

- A deployed registry account id.
- Whether the registry account should be deployed by the app, CLI, or a separate
  deployment script.
- The exact browser SDK `ForeignAccount` and storage requirements needed for a
  wallet-originated transaction to call the registry account.
- The exact transaction script argument wiring for pushing `NAME_HASH` and
  `OWNER` words from frontend inputs.
- The exact normalized `.miden` name hashing function that produces the
  `nameHash Word`.
- The exact Miden account id to `Word` encoding for the owner value.

## Required Next Step

Create a focused registry deployment proof:

1. Compile `contracts/registry/src/registry.masm` with
   `AccountComponent.compile(...)`.
2. Create storage slots `[StorageSlot.emptyValue(), StorageSlot.map(new StorageMap())]`.
3. Build a public registry account with `AccountBuilder`.
4. Save it with `client.newAccount(...)` or deploy/import it through a confirmed
   CLI flow.
5. Record the registry account id as `NEXT_PUBLIC_MIDEN_REGISTRY_ACCOUNT_ID`.
6. Confirm `nameHash Word` and `owner Word` encoding.
7. Build a non-empty `TransactionRequest` using the registry transaction script
   and request it through the wallet adapter.
