# Signing Input Format Blocker

> Miden v0.14 update: wallet packages now live under `@miden-sdk/*`. This older
> signing blocker remains a historical note until v0.14 signing formats are
> confirmed from the current packages.

The `Sign register intent` button is disabled for now because the installed
wallet adapter does not document a safe byte format for signing arbitrary
register-intent text.

## Error Observed

When the app called:

```ts
signBytes(encodedTextPayload, "signingInputs");
```

the wallet returned:

```txt
INVALID_PARAMS failed to deserialize SigningInputs invalid variant
```

This means raw UTF-8 encoded text is not valid input for the
`"signingInputs"` signing kind.

## Installed Types Inspected

- `node_modules/@demox-labs/miden-wallet-adapter-base/types.ts`
- `node_modules/@demox-labs/miden-wallet-adapter-base/dist/types.d.ts`
- `node_modules/@demox-labs/miden-wallet-adapter-base/dist/signer.d.ts`
- `node_modules/@demox-labs/miden-wallet-adapter-miden/dist/adapter.d.ts`
- `node_modules/@demox-labs/miden-wallet-adapter-miden/dist/adapter.js`
- `node_modules/@demox-labs/miden-sdk/dist/crates/miden_client_web.d.ts`
- `node_modules/@demox-labs/miden-sdk/dist/index.js`

## Confirmed Wallet Adapter API

The only confirmed signing kinds are:

```ts
export type SignKind = "word" | "signingInputs";
```

The hook exposes:

```ts
signBytes:
  | ((data: Uint8Array, kind: SignKind) => Promise<Uint8Array>)
  | undefined;
```

The Miden wallet adapter forwards the call directly to the injected wallet:

```ts
const result = await wallet.signBytes(message, kind);
return result.signature;
```

## Confirmed `signingInputs` Format

The SDK wrapper comments say the signing callback receives:

```txt
a Uint8Array produced by SigningInputs.serialize()
```

The installed SDK type exposes:

```ts
export class SigningInputs {
  static deserialize(bytes: Uint8Array): SigningInputs;
  static newArbitrary(felts: Felt[]): SigningInputs;
  static newTransactionSummary(summary: TransactionSummary): SigningInputs;
  static newBlind(word: Word): SigningInputs;
  serialize(): Uint8Array;
}
```

So `"signingInputs"` should receive bytes from `SigningInputs.serialize()`, not
raw encoded JSON or raw text.

## Confirmed `word` Format

The SDK type exposes:

```ts
export class Word {
  static deserialize(bytes: Uint8Array): Word;
  static newFromFelts(felt_vec: Felt[]): Word;
  constructor(u64_vec: BigUint64Array);
  static fromHex(hex: string): Word;
  serialize(): Uint8Array;
}
```

However, the wallet adapter docs do not state whether `signBytes(data, "word")`
expects:

- `Word.serialize()` bytes
- raw 32-byte word bytes
- a hex-decoded word
- a hash digest of an intent
- some other extension-specific format

Because this is not explicit, using `"word"` for a register intent would still
be guessing.

## Current Safe App Behavior

The UI now disables `Sign register intent` and shows:

```txt
Signing disabled: wallet adapter expects Word or SigningInputs bytes, but the register intent format is not confirmed yet.
```

## Next Safe Step

Confirm the exact payload format with Miden wallet docs or extension source:

- for `"word"`: whether the data must be `Word.serialize()` and how to derive
  the `Word` from `{ name, walletAddress, timestamp }`
- for `"signingInputs"`: whether register intents should use
  `SigningInputs.newArbitrary(...)`, `newBlind(...)`, or a transaction summary

Only after that should the button call `signBytes`.
