# Miden Name Registry Rust Component Skeleton

This folder switches the registry contract research from direct MASM storage
experiments to the official Rust smart contract path used by Miden v0.14 docs.

## Status

This is a source skeleton only. It is not wired to the Next.js app and it is not
compiled by `npm run build`.

Local build attempt status is tracked in:

- `docs/registry-rust-build-blocker.md`

The official v0.14 path is:

```text
Rust -> Wasm -> MASM -> ZK Circuit -> Proof
```

The Miden docs say `cargo-miden` compiles `#![no_std]` Rust into a `.masp`
Miden Assembly Package. The registry should therefore become a proper
`cargo-miden` smart contract project before deployment.

## Files

- `src/lib.rs`: minimal registry component shape with
  `register(name_hash, owner)` and `resolve(name_hash)`.

## Required Setup

Use the official Miden Rust template/tooling before trying to build this:

```bash
rustup toolchain install nightly-2025-07-20
git clone https://github.com/0xMiden/compiler
cd compiler
cargo install --path tools/cargo-miden --locked
cargo miden new name-registry-account
```

Then copy `src/lib.rs` into the generated `name-registry-account/src/lib.rs`
and build from inside the generated project:

```bash
cargo miden build --release
```

Expected artifact shape from the docs:

```text
target/miden/release/name-registry-account.masp
```

Do not add a hand-written `Cargo.toml` here until the official generated
template is available. The template defines the exact dependency versions,
allocator setup, panic strategy, crate type, and Miden metadata.

## Storage

The registry stores:

```text
name_hash: Word -> owner: Word
```

The Rust component uses a `StorageMap` field:

```rust
#[storage(description = "name_hash to owner account word")]
names: StorageMap
```

The official counter-contract pattern uses `StorageMapAccess` methods:

```rust
self.names.set(name_hash, owner);
self.names.get(&name_hash);
```

## Frontend Boundary

Do not connect this to the UI yet. Once a `.masp` package and registry account
deployment flow are confirmed, the frontend should call the deployed registry
account rather than the local mock adapter.
