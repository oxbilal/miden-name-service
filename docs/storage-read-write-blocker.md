# Storage Read/Write Blocker

## Goal

Find the exact Miden v0.14 MASM syntax for reading and writing the
`StorageSlot.map("mns.names", ...)` slot created in TypeScript, then add the
storage write to `register` and the storage read to `resolve` only after that
syntax is confirmed.

## Current Compiling State

The current registry component compile test remains unchanged:

- `lib/midenCompileTest.ts` creates an empty `StorageMap`.
- It wraps the map with `StorageSlot.map("mns.names", registryMap)`.
- It passes that slot to `client.compile.component({ code, slots, supportAllTypes })`.
- The MASM source keeps `pub proc ping`, `pub proc register`, and
  `pub proc resolve` compiling with placeholder stack handling only.

This confirms the TypeScript-side storage slot setup, not MASM storage mutation.

## Confirmed Installed SDK APIs

From `node_modules/@miden-sdk/miden-sdk/dist/st/api-types.d.ts`:

```ts
export interface CompileComponentOptions {
  code: string;
  slots?: StorageSlot[];
  supportAllTypes?: boolean;
}
```

From `node_modules/@miden-sdk/miden-sdk/dist/st/crates/miden_client_web.d.ts`:

```ts
export class StorageMap {
  insert(key: Word, value: Word): Word;
  constructor();
}

export class StorageSlot {
  static emptyValue(name: string): StorageSlot;
  static fromValue(name: string, value: Word): StorageSlot;
  static map(name: string, storage_map: StorageMap): StorageSlot;
}
```

These APIs are enough to create the `mns.names` map slot for compilation.

## MASM Syntax Found

The older Miden mapping example uses this MASM pattern:

```masm
use.miden::active_account
use.miden::native_account
use.std::sys

export.write_to_map
    push.1
    exec.native_account::set_map_item
    dropw dropw dropw dropw
end

export.get_value_in_map
    push.1
    exec.active_account::get_map_item
end

export.get_current_map_root
    push.1 exec.active_account::get_item
    exec.sys::truncate_stack
end
```

The documented stack contract for that pattern is:

- `set_map_item`: `[index, KEY, VALUE] -> [OLD_MAP_ROOT, OLD_MAP_VALUE]`
- `get_map_item`: `[index, KEY] -> [VALUE]`

Source checked:

- `https://miden.us.com/miden-tutorials/rust-client/mappings_in_masm_how_to/index`
- `https://docs.miden.xyz/miden-base/account/storage/`

## v0.14 Retest

On 2026-05-18, I rechecked the installed SDK and current official docs for the
exact v0.14 component form.

Local searches:

```text
rg -n "set_map_item|get_map_item|StorageMap|StorageSlot\\.map|native_account|active_account|storage::|account::|get_item|set_item|mns.names|compile.component|compileAccountComponentCode" node_modules\@miden-sdk docs contracts lib -S --glob "!**/*.map"
```

Official docs searched:

- `docs.miden.xyz/next` for v0.14 `active_account::get_map_item`
- `docs.miden.xyz/next` for v0.14 `native_account::set_map_item`
- Miden GitHub examples for `native_account::set_map_item` with `pub proc`

Confirmed in v0.14 docs:

- Miden accounts have code and storage.
- Account operations include `active_account` and `native_account`.
- Rust components can read/write storage maps with generated typed accessors,
  for example `self.balances.get(&key)` and `self.balances.set(key, value)`.

Still not found:

- A v0.14 MASM component example using `pub proc register`.
- A v0.14 MASM component example using `pub proc resolve`.
- A v0.14 `client.compile.component` example that imports
  `use.miden::active_account` and calls `exec.active_account::get_map_item`.
- A v0.14 `client.compile.component` example that imports
  `use.miden::native_account` and calls `exec.native_account::set_map_item`.
- Documentation for whether `StorageSlot.map("mns.names", ...)` is addressed in
  MASM by positional slot index, slot name metadata, or generated bindings.

## Why This Is Blocked For Our v0.14 Component

The MASM mapping example above is not a confirmed v0.14
`client.compile.component` fixture for this project because:

- It uses legacy `export.<name>` procedure syntax.
- Our v0.14 browser compile path already proved that component procedures must
  use `pub proc <name>`.
- Empty `pub proc` bodies fail with `invalid syntax`, so the current component
  intentionally uses non-empty placeholder bodies.
- The installed `@miden-sdk/miden-sdk` package exposes storage types and
  compiler APIs, but does not include a complete MASM component example that
  combines `pub proc` with `active_account::get_map_item` or
  `native_account::set_map_item`.
- The current v0.14 docs emphasize Rust components with typed storage access,
  such as `self.configs.get(&key)` and `self.configs.set(key, value)`, not the
  exact MASM source expected by `client.compile.component`.

Because of that, adding `exec.native_account::set_map_item` or
`exec.active_account::get_map_item` to `lib/midenCompileTest.ts` would be a guess.

## Current Decision

Keep `lib/midenCompileTest.ts` on the compiling v0.14 source:

- `ping` returns `1`
- `register` consumes placeholder `NAME_HASH` and `OWNER`
- `resolve` consumes placeholder `NAME_HASH` and returns a placeholder owner
- TypeScript supplies the `StorageSlot.map("mns.names", ...)` slot

Do not add MASM storage read/write until the v0.14 `pub proc` syntax and slot
addressing rule are confirmed.

## What Was Not Changed

No MASM storage read/write code was added to the compiling registry component.
No UI, register flow, deploy path, or transaction path was changed.

## Exact Missing Confirmation

We need one of the following before changing the MASM component:

- An official v0.14 MASM account component source that compiles through
  `client.compile.component` and uses `pub proc` plus
  `native_account::set_map_item`.
- An official v0.14 MASM account component source that compiles through
  `client.compile.component` and uses `pub proc` plus
  `active_account::get_map_item`.
- A local SDK test/example in `@miden-sdk/miden-sdk` showing the same pattern.

Once confirmed, the likely next component shape is:

```masm
use.miden::active_account
use.miden::native_account

pub proc register
    push.<confirmed_slot_index_or_name_binding>
    exec.native_account::set_map_item
    dropw dropw dropw dropw
end

pub proc resolve
    push.<confirmed_slot_index_or_name_binding>
    exec.active_account::get_map_item
end
```

The unresolved part is whether v0.14 `client.compile.component` expects map
slots to be referenced by positional index, generated name binding, or another
component metadata convention when the slot is created with
`StorageSlot.map("mns.names", ...)`.
