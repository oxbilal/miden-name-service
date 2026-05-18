# Miden Toolchain Setup For Registry Work

This document records the official Miden toolchain path for building and
deploying custom accounts, and how the counter contract pattern maps to the
Miden Name Service registry.

Sources checked:

- Miden installation docs:
  https://docs.miden.xyz/builder/get-started/setup/installation/
- Miden smart contract overview:
  https://docs.miden.xyz/builder/smart-contracts/overview/
- Miden first smart contract guide:
  https://docs.miden.xyz/builder/get-started/your-first-smart-contract/
- Miden create project guide:
  https://docs.miden.xyz/builder/get-started/your-first-smart-contract/create/
- Miden deploy guide:
  https://docs.miden.xyz/builder/get-started/your-first-smart-contract/deploy/
- `cargo-miden` compiler docs:
  https://docs.miden.xyz/compiler/usage/cargo-miden/

## Version Caveat

Miden tooling is moving quickly. The current builder docs show the newer
`midenup` + `miden` CLI flow, while the compiler docs still document
`cargo-miden` directly. Treat the newer `midenup` flow as the primary setup path
for app/project work, and `cargo-miden` as the compiler/Cargo-extension layer
behind or alongside that flow.

Do not mix commands blindly. Check `miden --help`, `cargo miden --help`, and the
generated project layout after installation.

## Install midenup

Official setup starts with Rust:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
. "$HOME/.cargo/env"
rustc --version
```

Install `midenup`:

```bash
cargo install midenup
```

The docs also note a git install fallback:

```bash
cargo install --git https://github.com/0xMiden/midenup.git
```

Initialize it:

```bash
midenup init
```

Install stable Miden components:

```bash
midenup install stable
```

Verify:

```bash
midenup show active-toolchain
which miden
```

On current docs, `midenup init` creates the `miden` command by symlinking into
the Cargo bin directory, usually `~/.cargo/bin`.

## Install / Use cargo-miden

The compiler docs say `cargo-miden` is a Cargo extension that orchestrates
`rustc` and `midenc` to compile Rust crates into Miden packages.

The documented install path is:

```bash
rustup toolchain install nightly-2025-07-20
git clone https://github.com/0xMiden/compiler
cd compiler
cargo install --path tools/cargo-miden --locked
```

Verify:

```bash
cargo help miden
cargo miden --help
```

Create an example:

```bash
cargo miden example counter-contract
```

Create a new project:

```bash
cargo miden new foo
```

Build a package:

```bash
cargo miden build --release
```

The documented output is:

```text
target/miden/release/foo.masp
```

The compiler docs also show `midenc run` for running compiled packages:

```bash
midenc run target/miden/release/foo.masp --inputs some_inputs.toml
```

## Create A Miden Smart Contract Project

The newer builder docs use:

```bash
miden new counter-project
cd counter-project
```

The generated workspace shape is:

```text
counter-project/
├── contracts/
│   ├── counter-account/
│   └── increment-note/
├── integration/
│   ├── src/
│   │   ├── bin/
│   │   ├── lib.rs
│   │   └── helpers.rs
│   └── tests/
├── Cargo.toml
└── rust-toolchain.toml
```

The docs define the split clearly:

- `contracts/`: contract crates.
- `integration/`: deployment scripts, interaction scripts, and tests.

Build a contract crate:

```bash
cd contracts/counter-account
miden build
```

This compiles Rust contract code into a Miden package (`.masp`).

## Contract Model

Miden smart contracts are accounts. The docs describe every account as having:

- code
- storage
- vault
- nonce

The compilation pipeline is:

```text
Rust -> Wasm -> Miden Assembly (MASM) -> ZK Circuit -> Proof
```

The output of `miden build` is a `.masp` Miden Assembly Package containing
compiled MASM and metadata.

## Counter Contract Pattern

The official counter account uses a Rust account component with a `StorageMap`:

```rust
#![no_std]
#![feature(alloc_error_handler)]

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

The paired increment note imports generated bindings for the counter account and
calls:

```rust
let initial_value = counter_account::get_count();
counter_account::increment_count();
let final_value = counter_account::get_count();
```

This is the closest official pattern for the registry: one account component
owns a `StorageMap`, and a note or transaction path calls its exported methods.

## Integration / Deploy Scripts

The deploy docs say the `integration/` folder is the command center for:

- contract deployment
- procedure calls
- state queries
- contract operations
- integration tests and mockchain tests

The official counter deployment script is:

```bash
cd integration
cargo run --bin increment_count --release
```

The script performs:

1. Set up a Miden client connected to testnet.
2. Build counter account and increment note packages.
3. Create the counter account with initial storage configuration.
4. Create a sender account for publishing notes.
5. Create and publish the increment note.
6. Consume the note to trigger the counter increment.

The docs emphasize that Miden contracts are deployed through state changes:
creating an account locally is not enough. The account becomes visible onchain
when it participates in a transaction that modifies its state.

The deploy script uses a helper like:

```rust
let counter_package = Arc::new(
    build_project_in_dir(Path::new("../contracts/counter-account"), true)?
);

let counter_account = create_account_from_package(
    &mut client,
    counter_package.clone(),
    counter_cfg,
)
.await?;
```

For storage, the counter script builds a named storage slot:

```rust
let count_storage_key =
    Word::from([Felt::new(0), Felt::new(0), Felt::new(0), Felt::new(1)]);
let initial_count =
    Word::from([Felt::new(0), Felt::new(0), Felt::new(0), Felt::new(0)]);

let counter_storage_slot =
    StorageSlotName::new("miden::component::miden_counter_account::count_map")?;

let storage_slots = vec![StorageSlot::with_map(
    counter_storage_slot.clone(),
    StorageMap::with_entries([(count_storage_key, initial_count)])?,
)];
```

Important current detail from the docs: in v0.13, storage slots are identified
by name rather than explicit index. The slot name pattern is:

```text
miden::component::<package_name>::<field_name>
```

## Adapting Counter Into Name Registry

The registry should follow the counter account model, not the older ad hoc MASM
only approach, if we want to match the current official toolchain.

Proposed registry account crate:

```text
contracts/name-registry-account/
├── Cargo.toml
└── src/lib.rs
```

Registry component shape:

```rust
#![no_std]
#![feature(alloc_error_handler)]

use miden::{component, StorageMap, StorageMapAccess, Word};

#[component]
struct NameRegistry {
    #[storage(description = "nameHash to owner account word")]
    names: StorageMap,
}

#[component]
impl NameRegistry {
    pub fn register(&mut self, name_hash: Word, owner: Word) {
        // TODO: reject duplicate name_hash once the empty/default Word check is confirmed.
        self.names.set(name_hash, owner);
    }

    pub fn resolve(&self, name_hash: Word) -> Word {
        self.names.get(&name_hash)
    }
}
```

Do not copy this into production unchanged. Exact type signatures and default
value checks must be confirmed against the generated project's Miden SDK
version.

Proposed integration script:

```text
integration/src/bin/deploy_registry.rs
```

It should mirror `increment_count.rs`:

1. Set up Miden client.
2. Build `../contracts/name-registry-account`.
3. Define the storage slot name for the registry map:

```text
miden::component::<registry_package_name>::names
```

4. Initialize storage with an empty `StorageMap` or a test entry.
5. Call `create_account_from_package(...)`.
6. Trigger one state-changing transaction so the registry account becomes
   visible onchain.
7. Print and persist the registry account id.

## Frontend Integration After Deploy

After deployment, this app needs:

```env
NEXT_PUBLIC_MIDEN_REGISTRY_ACCOUNT_ID=<registry-account-id>
```

Then `lib/registryContract.ts` needs to replace the current blocker with a real
custom transaction request that:

1. Normalizes the `.miden` name.
2. Converts the name into a `Word` key.
3. Converts the connected wallet account into an owner `Word`.
4. Builds or loads a transaction/note path that calls
   `NameRegistry::register(name_hash, owner)`.
5. Targets the deployed registry account id.
6. Calls wallet `requestTransaction(...)`.

## Current Repo Gap

This Next.js repo currently has:

- `contracts/registry/src/registry.masm`
- `contracts/registry/src/register_name.masm`
- registry blocker docs
- frontend blocker boundary

It does not yet have:

- a `miden new` generated workspace
- Rust account component crate
- `integration/` crate
- `miden` CLI installed locally
- `cargo-miden` installed locally
- deploy script equivalent to `increment_count.rs`

The safest next implementation step is to create a separate Miden project with
`miden new`, inspect the generated counter workspace, then port the name
registry into the same Rust component + integration script pattern.
