# Next Real Onchain Step

> Miden v0.14 update: this note is superseded by
> `docs/miden-v014-migration.md` and `docs/registry-build-blocker.md`. The active
> path is `@miden-sdk/*`, `MidenClient`, React SDK hooks, and `client.compile`.

This note is based only on the installed `@demox-labs/miden-sdk@0.12.5`
package in `node_modules`. The package contains a README and generated
TypeScript declarations, but no bundled custom-account registry example.

## Sources Inspected

- `node_modules/@demox-labs/miden-sdk/README.md`
- `node_modules/@demox-labs/miden-sdk/dist/index.d.ts`
- `node_modules/@demox-labs/miden-sdk/dist/crates/miden_client_web.d.ts`

No `examples/` or test files were present in the installed npm package.

## 1. Real Miden APIs We Can Call Now

### Client And Account Setup

The app already uses these safely:

```ts
const { WebClient, AccountStorageMode } = await import("@demox-labs/miden-sdk");

const client = await WebClient.createClient();
const account = await client.newWallet(
  AccountStorageMode.private(),
  true,
  0,
);

const accountHeaders = await client.getAccounts();
const loadedAccount = await client.getAccount(account.id());
```

Confirmed installed declarations:

```ts
createClient(
  node_url?: string | null,
  node_note_transport_url?: string | null,
  seed?: Uint8Array | null
): Promise<any>;

newWallet(
  storage_mode: AccountStorageMode,
  mutable: boolean,
  auth_scheme_id: number,
  init_seed?: Uint8Array | null
): Promise<Account>;

getAccounts(): Promise<AccountHeader[]>;
getAccount(account_id: AccountId): Promise<Account | undefined>;
```

The README shows `newWallet(accountStorageMode, mutable)`, but the installed
`.d.ts` requires `auth_scheme_id`. For this repo, use the installed declaration,
not the README snippet.

### Transaction Requests

The SDK exposes transaction request creation and submission:

```ts
const request = new TransactionRequestBuilder().build();
const result = await client.executeTransaction(accountId, request);
const transactionId = await client.submitNewTransaction(accountId, request);
```

Confirmed installed declarations:

```ts
export class TransactionRequestBuilder {
  withAuthArg(auth_arg: Word): TransactionRequestBuilder;
  withScriptArg(script_arg: Word): TransactionRequestBuilder;
  extendAdviceMap(advice_map: AdviceMap): TransactionRequestBuilder;
  withCustomScript(script: TransactionScript): TransactionRequestBuilder;
  withForeignAccounts(foreign_accounts: ForeignAccountArray): TransactionRequestBuilder;
  withOwnOutputNotes(notes: OutputNoteArray): TransactionRequestBuilder;
  withExpectedFutureNotes(note_details_and_tag: NoteDetailsAndTagArray): TransactionRequestBuilder;
  withExpectedOutputRecipients(recipients: NoteRecipientArray): TransactionRequestBuilder;
  withAuthenticatedInputNotes(notes: NoteIdAndArgsArray): TransactionRequestBuilder;
  withUnauthenticatedInputNotes(notes: NoteAndArgsArray): TransactionRequestBuilder;
  constructor();
  build(): TransactionRequest;
}

executeTransaction(
  account_id: AccountId,
  transaction_request: TransactionRequest
): Promise<TransactionResult>;

submitNewTransaction(
  account_id: AccountId,
  transaction_request: TransactionRequest
): Promise<TransactionId>;
```

The README includes a confirmed high-level flow for consuming faucet notes:

```ts
await webClient.syncState();
const consumableNotes = await webClient.getConsumableNotes(account);
const request = webClient.newConsumeTransactionRequest([noteIdToConsume]);
const transactionId = await webClient.submitNewTransaction(account, request);
```

However, the installed declarations type `getConsumableNotes` and
`submitNewTransaction` with `AccountId`, not `Account`. Use `account.id()` or a
stored `AccountId` object when implementing.

### Account Component Construction

The SDK exposes component construction APIs:

```ts
const builder = client.createScriptBuilder();
const component = AccountComponent.compile(accountCode, builder, storageSlots);
const accountResult = new AccountBuilder(seed)
  .storageMode(AccountStorageMode.public())
  .withComponent(component)
  .build();

await client.newAccount(accountResult.account, false);
```

Confirmed installed declarations:

```ts
export class AccountComponent {
  static fromPackage(
    _package: Package,
    storage_slots: StorageSlotArray
  ): AccountComponent;

  static compile(
    account_code: string,
    builder: ScriptBuilder,
    storage_slots: StorageSlot[]
  ): AccountComponent;

  getProcedures(): GetProceduresResultItem[];
  getProcedureHash(procedure_name: string): string;
  withSupportsAllTypes(): AccountComponent;
}

export class AccountBuilder {
  constructor(init_seed: Uint8Array);
  accountType(account_type: AccountType): AccountBuilder;
  storageMode(storage_mode: AccountStorageMode): AccountBuilder;
  withComponent(account_component: AccountComponent): AccountBuilder;
  withAuthComponent(account_component: AccountComponent): AccountBuilder;
  withNoAuthComponent(): AccountBuilder;
  withBasicWalletComponent(): AccountBuilder;
  build(): AccountBuilderResult;
}

newAccount(account: Account, overwrite: boolean): Promise<void>;
```

These APIs can be called, but we do not yet have confirmed registry component
source syntax to pass into `AccountComponent.compile`.

### Account Component Invocation Plumbing

The SDK exposes script and library plumbing that appears intended for invoking
custom logic:

```ts
const scriptBuilder = client.createScriptBuilder();
const txScript = scriptBuilder.compileTxScript(source);
const request = new TransactionRequestBuilder()
  .withCustomScript(txScript)
  .build();
```

Confirmed installed declarations:

```ts
createScriptBuilder(): ScriptBuilder;

export class ScriptBuilder {
  linkModule(module_path: string, module_code: string): void;
  buildLibrary(library_path: string, source_code: string): Library;
  compileTxScript(tx_script: string): TransactionScript;
  compileNoteScript(program: string): NoteScript;
  linkStaticLibrary(library: Library): void;
  linkDynamicLibrary(library: Library): void;
}
```

The declaration comments say `linkDynamicLibrary` is useful for foreign account
invocation where account code is available on-chain. The package does not include
a complete example showing the exact transaction script source for calling a
custom account component procedure.

### Storage Map Read/Write

The SDK exposes local storage map construction and account storage reads:

```ts
const map = new StorageMap();
map.insert(keyWord, valueWord);
const slot = StorageSlot.map(map);

const storage = account.storage();
const value = storage.getMapItem(slotIndex, keyWord);
const entries = storage.getMapEntries(slotIndex);
```

Confirmed installed declarations:

```ts
export class StorageMap {
  constructor();
  insert(key: Word, value: Word): Word;
}

export class StorageSlot {
  static fromValue(value: Word): StorageSlot;
  static emptyValue(): StorageSlot;
  static map(storage_map: StorageMap): StorageSlot;
}

export class AccountStorage {
  commitment(): Word;
  getMapItem(index: number, key: Word): Word | undefined;
  getMapEntries(index: number): JsStorageMapEntry[] | undefined;
  getItem(index: number): Word | undefined;
}
```

These APIs let us build initial storage slots and read account storage snapshots.
They do not, by themselves, prove the account-procedure syntax for mutating a
registry map during a transaction.

## 2. What Is Still Impossible Or Missing

- No installed example shows a custom account component that writes to a
  `StorageMap`.
- No confirmed Miden Assembly source for `register(name, owner)` or a minimal
  map mutation procedure.
- No confirmed transaction script source that calls a custom account component
  procedure.
- No confirmed registry record encoding for `name -> owner + target`, because
  `StorageMap` stores `Word -> Word`.
- No confirmed browser SDK flow for deploying a public registry account and then
  invoking it as a foreign account from a user account.
- No confirmed way to hash a normalized `.miden` string into the exact `Word`
  key format expected by Miden contracts.

Because of this, a real registry write is still blocked. The current
`lib/registryAdapter.ts` correctly stops miden mode at:

```ts
throw new Error(
  "Miden onchain registry write not implemented yet. TODO: custom account component + StorageMap write.",
);
```

## 3. Smallest Real Transaction Before Registry Write

The smallest real transaction we can send without guessing registry APIs is a
standard SDK transaction that does not involve custom registry storage:

1. Create or load a local Miden account with `createOrLoadAccount()`.
2. Fund it through the Miden faucet so it has a consumable note.
3. Call `client.syncState()`.
4. Call `client.getConsumableNotes(accountId)`.
5. Build a consume request with `client.newConsumeTransactionRequest([noteId])`.
6. Submit it with `client.submitNewTransaction(accountId, request)`.
7. Sync again and show the transaction id/status in the UI.

This is the safest first real onchain step because the SDK README explicitly
documents consume transactions, and the installed declarations expose the same
building blocks. It exercises:

- account id handling
- state sync
- note discovery
- transaction request creation
- transaction submission

It does not require a custom account component, a registry account, or a
StorageMap write.

## Next Implementation Boundary

The next code step should be a new function outside the registry adapter, for
example:

```ts
async function consumeFirstAvailableNote(client: MidenClient, accountId: AccountId) {
  await client.syncState();
  const notes = await client.getConsumableNotes(accountId);
  if (notes.length === 0) {
    throw new Error("No consumable notes found for this account.");
  }

  const noteId = notes[0].inputNoteRecord().id();
  const request = client.newConsumeTransactionRequest([noteId]);
  return client.submitNewTransaction(accountId, request);
}
```

Before implementing this, keep the actual `AccountId` object from
`createOrLoadAccount()` instead of only storing `account.id().toString()` in the
UI. That avoids guessing `AccountId.fromHex()` or reconstructing account ids
from display strings.

The registry adapter should stay in two modes:

- `local`: updates local React state.
- `miden`: validates `MidenClient` and account id, then returns the clear
  not-implemented error until custom account component + StorageMap write syntax
  is confirmed.
