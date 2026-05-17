# Registry Build Blocker

This documents the first real registry build attempt and why the repo cannot
yet produce a deployable registry account artifact.

## Goal Attempted

Compile `contracts/registry/src/registry.masm` into a Miden account component
using only installed, official SDK APIs.

## Files Inspected

- `docs/registry-deploy-checklist.md`
- `package.json`
- `node_modules/.bin`
- `node_modules/@demox-labs/miden-sdk/package.json`
- `node_modules/@demox-labs/miden-sdk/dist/index.d.ts`
- `node_modules/@demox-labs/miden-sdk/dist/crates/miden_client_web.d.ts`
- `contracts/registry/src/registry.masm`

## Confirmed Available APIs

The installed `@demox-labs/miden-sdk@0.12.5` exports:

```ts
WebClient.createClient()
client.createScriptBuilder()
AccountComponent.compile(accountCode, builder, storageSlots)
StorageSlot.emptyValue()
StorageSlot.map(new StorageMap())
AccountBuilder
AccountStorageMode
TransactionRequestBuilder
```

These are browser/WASM APIs. They are not exposed as a local `miden` or
`miden-client` CLI command in this project.

## Commands Checked

No Miden CLI binary is installed in `node_modules/.bin`.

Checked commands:

```powershell
where.exe miden
where.exe miden-client
```

Both returned:

```text
INFO: Could not find files for the given pattern(s).
```

`node_modules/.bin` contains Next.js, TypeScript, ESLint, and related frontend
tooling only. It does not contain a Miden contract/account builder.

## Direct SDK Compile Attempt

I tried the smallest direct Node compile with the installed SDK:

```powershell
node --input-type=module -e "import fs from 'node:fs'; import { WebClient, AccountComponent, StorageMap, StorageSlot } from '@demox-labs/miden-sdk'; const source = fs.readFileSync('contracts/registry/src/registry.masm','utf8'); const client = await WebClient.createClient(); const builder = client.createScriptBuilder(); const component = AccountComponent.compile(source, builder, [StorageSlot.emptyValue(), StorageSlot.map(new StorageMap())]).withSupportsAllTypes(); console.log(component.getProcedures().map((p) => String(p)).join('\n')); client.terminate?.();"
```

It failed before compiling MASM:

```text
TypeError: fetch failed
cause: Error: not implemented... yet...
at __wbg_init (.../node_modules/@demox-labs/miden-sdk/dist/Cargo-68d95828.js)
```

The SDK README explains that this package is a WASM web-client build and uses a
loader that avoids SSR. In Node, the generated WASM loader reaches a `fetch()`
path that does not work for the local generated module. Because of that, this
repo cannot currently use the npm SDK as a normal Node build script.

## Exact Missing Build Runner

One of these confirmed tools/APIs is needed next:

- An installed official `miden` CLI command that can compile/deploy a Miden
  account/component package from MASM.
- An installed official `miden-client` CLI command with a custom account
  component deploy flow.
- An official Node-compatible SDK entrypoint or documented loader that can call
  `AccountComponent.compile(...)` outside the browser.
- A documented browser-based deploy flow that compiles the component in the app
  and persists/deploys the account, including the final registry account id.

Until one of those exists, adding `npm run build:registry` would be misleading:
there is no confirmed command for it to run.

## Current Status

Ready:

- MASM scaffold exists.
- The frontend no longer sends an empty registry transaction.
- The app build passes.

Blocked:

- No local official Miden build/deploy command is available.
- The installed npm SDK cannot be used as a Node build runner in this repo
  without an official Node WASM-loading path.
- The registry account has not been compiled or deployed.
- No `NEXT_PUBLIC_MIDEN_REGISTRY_ACCOUNT_ID` can be produced yet.
