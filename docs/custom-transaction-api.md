# Custom Transaction API

> Miden v0.14 update: app code now imports `Transaction` from
> `@miden-sdk/miden-wallet-adapter-base` and wallet hooks from
> `@miden-sdk/miden-wallet-adapter-react`. Treat the older `@demox-labs/*`
> references below as historical research only. See
> `docs/miden-v014-migration.md` for the active integration path.

This note documents the installed `@demox-labs/miden-wallet-adapter` custom transaction API as found in `node_modules`.

## Files Checked

- `node_modules/@demox-labs/miden-wallet-adapter/README.md`
- `node_modules/@demox-labs/miden-wallet-adapter/dist/index.d.ts`
- `node_modules/@demox-labs/miden-wallet-adapter-base/transaction.ts`
- `node_modules/@demox-labs/miden-wallet-adapter-base/dist/transaction.d.ts`
- `node_modules/@demox-labs/miden-wallet-adapter-base/docs/classes/CustomTransaction.md`
- `node_modules/@demox-labs/miden-wallet-adapter-base/docs/classes/Transaction.md`
- `node_modules/@demox-labs/miden-sdk/dist/crates/miden_client_web.d.ts`

## Exact APIs Found

The all-in-one package re-exports the base, React, React UI, and Miden adapter packages:

```ts
export * from '@demox-labs/miden-wallet-adapter-base';
export * from '@demox-labs/miden-wallet-adapter-react';
export * from '@demox-labs/miden-wallet-adapter-reactui';
export * from '@demox-labs/miden-wallet-adapter-miden';
```

The React wallet hook exposes:

```ts
requestTransaction: MessageSignerWalletAdapterProps['requestTransaction'] | undefined;
```

The signer interface defines:

```ts
requestTransaction(transaction: MidenTransaction): Promise<string>;
```

The custom transaction payload shape is:

```ts
export interface MidenCustomTransaction {
  address: string;
  recipientAddress: string;
  transactionRequest: string;
  inputNoteIds?: string[];
  importNotes?: string[];
}
```

The `CustomTransaction` constructor is:

```ts
constructor(
  address: string,
  recipientAddress: string,
  transactionRequest: TransactionRequest,
  inputNotesIds?: string[],
  inputNoteBytes?: Uint8Array[]
)
```

Inside the constructor, the adapter calls:

```ts
const requestBytes = transactionRequest.serialize();
const base64 = u8ToB64(requestBytes);
this.transactionRequest = base64;
```

The `Transaction` helper can wrap it into the shape expected by `requestTransaction`:

```ts
static createCustomTransaction(
  address: string,
  recipientAddress: string,
  transactionRequest: TransactionRequest,
  inputNoteIds?: string[],
  noteBytes?: Uint8Array[]
): Transaction
```

The installed Miden SDK exposes a request builder:

```ts
export class TransactionRequestBuilder {
  constructor();
  build(): TransactionRequest;
}
```

The resulting `TransactionRequest` supports:

```ts
serialize(): Uint8Array;
```

## README Example

The wallet adapter README includes this example:

```tsx
import { useWallet, CustomTransaction } from '@demox-labs/miden-wallet-adapter';

const { wallet, accountId, requestTransaction } = useWallet();

const customTransaction = new CustomTransaction(
  accountId,
  transactionRequest // TransactionRequest from Miden Web SDK
);

await requestTransaction(customTransaction);
```

This README example appears stale relative to the installed TypeScript API because the current `CustomTransaction` constructor requires `address`, `recipientAddress`, and `transactionRequest`. The current `requestTransaction` also expects a `MidenTransaction`, so the safer installed helper is `Transaction.createCustomTransaction(...)`.

## Safe Test Added

The app now includes a visible `Test custom transaction request` button. It:

- requires a connected Miden wallet adapter account
- dynamically imports `TransactionRequestBuilder` from `@demox-labs/miden-sdk`
- builds an empty `TransactionRequest` with `new TransactionRequestBuilder().build()`
- wraps it with `Transaction.createCustomTransaction(walletAccountId, walletAccountId, transactionRequest)`
- calls `requestTransaction(transaction)`
- shows either the returned transaction id/status or the exact error

This does not include a registry account, registry component invocation, storage key, `StorageMap` write, name, owner, or target. It is only a wallet adapter transaction request smoke test.

## What Is Still Missing

- A confirmed custom registry account/component package.
- The exact Miden transaction script or component invocation for `register(name, owner)`.
- The exact storage layout and `StorageMap` write call for the registry.
- A confirmed non-empty transaction request payload that the wallet accepts for a registry operation.
- Confirmation whether an empty `TransactionRequestBuilder().build()` request is accepted by the wallet extension at runtime.

Until those are confirmed, registry registration remains mock/local.
