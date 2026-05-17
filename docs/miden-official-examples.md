# Official Miden Examples And Registry Relevance

This note records the official Miden examples and installed SDK APIs found while
researching custom accounts, account components, contract-like code, and storage.
It is research only. No registry contract code has been added yet.

## Installed SDK Package

- Package: `@demox-labs/miden-sdk`
- Installed version: `0.12.5`
- Local package metadata: `node_modules/@demox-labs/miden-sdk/package.json`
- Local README: `node_modules/@demox-labs/miden-sdk/README.md`
- TypeScript API surface:
  `node_modules/@demox-labs/miden-sdk/dist/crates/miden_client_web.d.ts`

The installed npm package includes the compiled browser SDK, generated
TypeScript declarations, WASM assets, and a high-level README. It does not
include a full custom registry/account example or source-level contract
template.

## Official Links And Files Found

- Official web SDK README, installed locally:
  `node_modules/@demox-labs/miden-sdk/README.md`
- Official Miden account component docs:
  <https://docs.miden.xyz/miden-base/account/components/>
- Official Miden account storage docs:
  <https://docs.miden.xyz/miden-base/account/storage/>
- Official Miden TypeScript account retrieval docs:
  <https://docs.miden.xyz/miden-client/web-client/accounts/>
- Official Miden client CLI reference:
  <https://0xmiden.github.io/miden-client/cli-reference.html>
- Official Miden smart contract overview:
  <https://docs.miden.xyz/builder/smart-contracts/overview/>
- Official `miden-base` repository:
  <https://github.com/0xMiden/miden-base>

## Exact APIs And Syntax Found

### Browser Client And Wallet Creation

From `node_modules/@demox-labs/miden-sdk/README.md`:

```ts
import { AccountStorageMode, WebClient } from "@demox-labs/miden-sdk";

const webClient = await WebClient.createClient();
const accountStorageMode = AccountStorageMode.private();
const mutable = true;
const account = await webClient.newWallet(accountStorageMode, mutable);

console.log(account.id().toString());
```

The installed declaration currently exposes `newWallet` with an explicit auth
scheme parameter:

```ts
newWallet(
  storage_mode: AccountStorageMode,
  mutable: boolean,
  auth_scheme_id: number,
  init_seed?: Uint8Array | null
): Promise<Account>;
```

### Account Loading

From the official TypeScript accounts docs and installed declarations:

```ts
const webClient = await WebClient.createClient();
const accounts = await webClient.getAccounts();
const account = await webClient.getAccount(accountId);
```

Installed signatures:

```ts
getAccounts(): Promise<AccountHeader[]>;
getAccount(account_id: AccountId): Promise<Account | undefined>;
```

### Account Component Construction

From `miden_client_web.d.ts`:

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
```

This is the closest installed browser SDK API for compiling a component from
source text and storage slots. The package does not include a concrete Miden
Assembly component example for a map-backed registry.

### Account Builder

From `miden_client_web.d.ts`:

```ts
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

export class AccountBuilderResult {
  readonly seed: Word;
  readonly account: Account;
}
```

Persisting a built account is exposed as:

```ts
newAccount(account: Account, overwrite: boolean): Promise<void>;
```

### Storage Maps And Slots

From the official account storage docs:

- An account has up to 255 storage slots.
- A value slot stores one 32-byte word.
- A map slot stores the root commitment of a `StorageMap`.
- `StorageMap` is a sparse Merkle tree key-value store.
- Map keys and values are both 32-byte words.

From `miden_client_web.d.ts`:

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

The docs also describe component metadata TOML for map slots:

```toml
[[storage]]
name = "procedure_thresholds"
description = "Map which stores procedure thresholds (PROC_ROOT -> signature threshold)"
slot = 3
type = "map"
```

And static map entries:

```toml
[[storage]]
name = "map_storage_entry"
slot = 2
values = [
  { key = "0x1", value = ["0x0", "249381274", "998123581", "124991023478"] }
]
```

### Script Building And Transaction Requests

From `miden_client_web.d.ts`:

```ts
export class ScriptBuilder {
  linkModule(module_path: string, module_code: string): void;
  buildLibrary(library_path: string, source_code: string): Library;
  compileTxScript(tx_script: string): TransactionScript;
  compileNoteScript(program: string): NoteScript;
  linkStaticLibrary(library: Library): void;
  linkDynamicLibrary(library: Library): void;
}

export class TransactionRequestBuilder {
  withAuthArg(auth_arg: Word): TransactionRequestBuilder;
  withScriptArg(script_arg: Word): TransactionRequestBuilder;
  extendAdviceMap(advice_map: AdviceMap): TransactionRequestBuilder;
  withCustomScript(script: TransactionScript): TransactionRequestBuilder;
  withForeignAccounts(foreign_accounts: ForeignAccountArray): TransactionRequestBuilder;
  build(): TransactionRequest;
}
```

Relevant WebClient transaction APIs:

```ts
createScriptBuilder(): ScriptBuilder;
executeTransaction(
  account_id: AccountId,
  transaction_request: TransactionRequest
): Promise<TransactionResult>;
submitNewTransaction(
  account_id: AccountId,
  transaction_request: TransactionRequest
): Promise<TransactionId>;
```

### CLI Custom Account Syntax

The official CLI reference shows custom account creation through component
templates:

```bash
miden-client new-wallet --extra-components template1,template2
miden-client new-account --account-type fungible-faucet --component-templates basic-fungible-faucet --init-storage-data-path init_data.toml
```

It also states that templates can contain placeholders, and
`--init-storage-data-path` supplies TOML values for those placeholders.

## Closest Example To Our Registry

The closest official example is the account component storage-map pattern in the
account components docs:

- A component template defines its own storage layout.
- A storage entry can be a map slot with `type = "map"`.
- A map stores word-to-word key/value pairs.
- Placeholder values can be supplied later through initialization data.

For Miden Name Service, the likely equivalent is:

- A registry account composed from a custom registry component.
- One map slot for `nameHash -> record`.
- The `nameHash` key is a `Word`, likely derived from the normalized `.miden`
  name.
- The value is also a `Word`; additional fields such as owner and target may
  require either multiple map slots, packed words, or a secondary key scheme.
- `register`, `transfer`, and `updateTarget` become account procedures that
  read and update the registry account storage map.
- `resolve` can read from the map, either through account procedure output or by
  loading account storage when the registry account is public/tracked.

## What Is Missing

- A complete official browser SDK example for creating a custom account
  component from source, attaching it with `AccountBuilder`, saving it with
  `newAccount`, and invoking it with a transaction script.
- Confirmed Miden Assembly source syntax for account procedures that mutate a
  storage map.
- Confirmed imports and procedure names for map reads/writes from account code,
  such as the exact syntax around `active_account::get_map_item` and any setter
  procedure.
- Confirmed encoding for a registry record larger than one word.
- A confirmed transaction script example that invokes custom account component
  procedures from a user account.
- A confirmed foreign account/FPI flow for calling a registry account from
  another account in the browser SDK.
- Deployment/import workflow for a public registry account that frontends can
  consistently resolve against.

Until those pieces are confirmed, the registry should remain documentation and
scaffold only. The next implementation step should be an isolated proof of
concept that compiles a minimal custom account component from official source
syntax, creates a public account with one map slot, and executes a transaction
that mutates one known key.
