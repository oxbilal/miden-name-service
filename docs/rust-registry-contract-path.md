# Rust Registry Contract Path

## Why Switch From MASM

The direct MASM path is blocked because the repo has not found a confirmed
Miden v0.14 `client.compile.component` source example that combines:

- `pub proc`
- `StorageSlot.map("mns.names", ...)`
- `native_account::set_map_item`
- `active_account::get_map_item`

The official v0.14 smart contract overview instead points at Rust components:
Rust is compiled to Wasm, then MASM, then proof execution.

## Official v0.14 Contract Model

The v0.14 smart contract overview says:

- every account has code, storage, vault, and nonce
- components are reusable code modules attached to accounts
- each component defines its own storage layout and public methods
- the `#[component]` macro generates the component interface
- the build pipeline is `Rust -> Wasm -> MASM -> ZK Circuit -> Proof`
- `cargo-miden` compiles `#![no_std]` Rust into a `.masp` package

Primary docs checked:

- `https://docs.miden.xyz/builder/smart-contracts/overview/`
- `https://docs.miden.xyz/compiler/usage/cargo-miden/`
- `https://docs.miden.xyz/quick-start/your-first-smart-contract/deploy/`
- `https://docs.miden.xyz/miden-base/account/components/`

## Storage Access

The closest official pattern is the counter contract with a Rust component
owning a `StorageMap`.

Pattern:

```rust
use miden::{component, felt, Felt, StorageMap, StorageMapAccess, Word};

#[component]
struct CounterContract {
    #[storage(description = "counter contract storage map")]
    count_map: StorageMap,
}

#[component]
impl CounterContract {
    pub fn get_count(&self) -> Felt {
        let key = Word::from_u64_unchecked(0, 0, 0, 1);
        self.count_map.get(&key)
    }

    pub fn increment_count(&mut self) -> Felt {
        let key = Word::from_u64_unchecked(0, 0, 0, 1);
        let current_value: Felt = self.count_map.get(&key);
        let new_value = current_value + felt!(1);
        self.count_map.set(key, new_value);
        new_value
    }
}
```

For Miden Name Service, the equivalent storage model is:

```text
name_hash: Word -> owner: Word
```

## Minimal Registry Skeleton

Added:

- `contracts/registry-rust/README.md`
- `contracts/registry-rust/src/lib.rs`

Skeleton:

```rust
#![no_std]
#![feature(alloc_error_handler)]

use miden::{component, StorageMap, StorageMapAccess, Word};

#[component]
struct NameRegistry {
    #[storage(description = "name_hash to owner account word")]
    names: StorageMap,
}

#[component]
impl NameRegistry {
    pub fn register(&mut self, name_hash: Word, owner: Word) {
        self.names.set(name_hash, owner);
    }

    pub fn resolve(&self, name_hash: Word) -> Word {
        self.names.get(&name_hash)
    }
}
```

This is a skeleton, not a completed deployed contract. Duplicate-name rejection
still needs an official/default empty value pattern before implementation.

## Compile And Deploy Path

The official toolchain path requires `cargo-miden`.

Setup from the docs:

```bash
rustup toolchain install nightly-2025-07-20
git clone https://github.com/0xMiden/compiler
cd compiler
cargo install --path tools/cargo-miden --locked
```

Create a generated contract project:

```bash
cargo miden new name-registry-account
```

Build:

```bash
cd name-registry-account
cargo miden build --release
```

Expected artifact:

```text
target/miden/release/name-registry-account.masp
```

## How This Connects To `client.compile`

Current installed browser SDK confirms:

```ts
client.compile.component({ code, slots?, supportAllTypes? })
```

That compiles MASM source strings, not Rust source. The Rust path produces a
`.masp` package through `cargo-miden`. The deploy docs use a helper pattern like:

```rust
let contract_package = Arc::new(
    build_project_in_dir(Path::new("../contracts/counter-account"), true)?
);

let account = create_account_from_package(
    &mut client,
    contract_package.clone(),
    account_cfg,
).await?;
```

So the safe next implementation step is not browser `client.compile` for Rust.
It is creating a real `cargo-miden` generated registry account project and
building a `.masp` package outside the Next.js app.

## What Is Still Missing

- `cargo-miden` is not part of this repo's npm toolchain.
- No generated `cargo-miden new` project has been added yet.
- The exact dependency versions in the generated `Cargo.toml` must come from
  the official template, not guessed by this Next.js repo.
- The integration/deploy script needs to create a registry account from the
  compiled package.
- The frontend needs a deployed registry account id before replacing mock
  registration.

## Next Safe Step

Install/use `cargo-miden`, generate `name-registry-account`, copy the skeleton
into that generated project, and run:

```bash
cargo miden build --release
```

Only after a `.masp` builds should we add a deployment script and frontend
registry call.
