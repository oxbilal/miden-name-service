# Miden Wallet Transaction And Signing API

> Miden v0.14 update: app code now uses
> `@miden-sdk/miden-wallet-adapter-react`, `@miden-sdk/miden-wallet-adapter-base`,
> and `@miden-sdk/react`. Treat the older `@demox-labs/*` references below as
> historical research only. See `docs/miden-v014-migration.md` for the active
> integration path.

This note records the wallet transaction/signing APIs found in the installed
`@demox-labs/miden-wallet-adapter@0.10.0` package. It does not define or build a
registry contract.

## Sources Inspected

- `node_modules/@demox-labs/miden-wallet-adapter/README.md`
- `node_modules/@demox-labs/miden-wallet-adapter/dist/index.d.ts`
- `node_modules/@demox-labs/miden-wallet-adapter-react/dist/useWallet.d.ts`
- `node_modules/@demox-labs/miden-wallet-adapter-base/dist/signer.d.ts`
- `node_modules/@demox-labs/miden-wallet-adapter-base/dist/transaction.d.ts`
- `node_modules/@demox-labs/miden-wallet-adapter-base/dist/types.d.ts`
- `node_modules/@demox-labs/miden-wallet-adapter-miden/dist/adapter.d.ts`
- `node_modules/@demox-labs/miden-wallet-adapter-miden/dist/adapter.js`

## Wallet Hook

The React hook is available:

```ts
import { useWallet } from "@demox-labs/miden-wallet-adapter";
```

Installed type:

```ts
export interface WalletContextState {
  wallet: Wallet | null;
  address: string | null;
  publicKey: Uint8Array | null;
  connecting: boolean;
  connected: boolean;
  disconnecting: boolean;
  requestTransaction:
    | MessageSignerWalletAdapterProps["requestTransaction"]
    | undefined;
  requestAssets: MessageSignerWalletAdapterProps["requestAssets"] | undefined;
  requestPrivateNotes:
    | MessageSignerWalletAdapterProps["requestPrivateNotes"]
    | undefined;
  signBytes: MessageSignerWalletAdapterProps["signBytes"] | undefined;
  importPrivateNote:
    | MessageSignerWalletAdapterProps["importPrivateNote"]
    | undefined;
  requestConsumableNotes:
    | MessageSignerWalletAdapterProps["requestConsumableNotes"]
    | undefined;
}
```

Important mismatch: the package README examples refer to `accountId`, but the
installed hook type exposes `address`. In this app, use `address` as the
connected wallet account/address value.

## Transaction Requests

The wallet adapter supports three transaction shapes.

### Send Transaction

```ts
export interface MidenSendTransaction {
  senderAddress: string;
  recipientAddress: string;
  faucetId: string;
  noteType: "public" | "private";
  amount: number;
  recallBlocks?: number;
}

export declare class SendTransaction implements MidenSendTransaction {
  constructor(
    sender: string,
    recipient: string,
    faucetId: string,
    noteType: "public" | "private",
    amount: number,
    recallBlocks?: number,
  );
}
```

The adapter exposes:

```ts
requestSend(transaction: MidenSendTransaction): Promise<string>;
```

The README shows usage through `wallet.adapter.requestSend(transaction)`.

### Consume Transaction

```ts
export interface MidenConsumeTransaction {
  faucetId: string;
  noteId: string;
  noteType: "public" | "private";
  amount: number;
  noteBytes?: string;
}

export declare class ConsumeTransaction implements MidenConsumeTransaction {
  constructor(
    faucetId: string,
    noteId: string,
    noteType: "public" | "private",
    amount: number,
    noteBytes?: Uint8Array,
  );
}
```

The adapter exposes:

```ts
requestConsume(transaction: MidenConsumeTransaction): Promise<string>;
```

### Custom Transaction

```ts
import type { TransactionRequest } from "@demox-labs/miden-sdk";

export interface MidenCustomTransaction {
  address: string;
  recipientAddress: string;
  transactionRequest: string;
  inputNoteIds?: string[];
  importNotes?: string[];
}

export declare class CustomTransaction implements MidenCustomTransaction {
  constructor(
    address: string,
    recipientAddress: string,
    transactionRequest: TransactionRequest,
    inputNotesIds?: string[],
    inputNoteBytes?: Uint8Array[],
  );
}
```

The adapter exposes:

```ts
requestTransaction(transaction: MidenTransaction): Promise<string>;
```

The README shows `new CustomTransaction(accountId, transactionRequest)`, but the
installed declaration requires both `address` and `recipientAddress` before the
`TransactionRequest`. Use the installed declaration as source of truth.

## Signature API

The hook exposes:

```ts
signBytes:
  | ((data: Uint8Array, kind: SignKind) => Promise<Uint8Array>)
  | undefined;
```

Confirmed `SignKind` type:

```ts
export type SignKind = "word" | "signingInputs";
```

The Miden wallet adapter implementation forwards directly to the injected wallet:

```ts
const result = await wallet.signBytes(message, kind);
return result.signature;
```

The injected wallet interface is:

```ts
signBytes(message: Uint8Array, kind: SignKind): Promise<{
  signature: Uint8Array;
}>;
```

## Register Intent Signing Status

Requested intent message:

```txt
Register bilala.miden to wallet address
```

A plain-message signing button was not added because the installed API does not
confirm a plain text/message signing kind. The only confirmed signing kinds are:

- `"word"`
- `"signingInputs"`

Passing UTF-8 text bytes with one of those kinds would guess wallet semantics.
The safe next step is to confirm one of these before adding the button:

- whether `"word"` accepts arbitrary UTF-8 bytes, or only a Miden `Word`-shaped
  payload
- whether `"signingInputs"` requires serialized Miden `SigningInputs`
- whether the wallet extension exposes a separate plain-message signing API not
  represented in this package

## What We Can Safely Use Now

- Show wallet connection state with `useWallet()`.
- Read connected wallet `address` and `publicKey`.
- Request supported transaction classes once all required fields are known:
  `SendTransaction`, `ConsumeTransaction`, or `CustomTransaction`.
- Use `requestTransaction()` for custom `TransactionRequest` objects after the
  registry transaction exists.

## What Remains Blocked

- Plain register-intent signing for `"Register bilala.miden to wallet address"`
  is blocked until the wallet package confirms the correct signing payload kind.
- Registry writes remain blocked until the custom registry account/component and
  `StorageMap` write transaction are implemented.
