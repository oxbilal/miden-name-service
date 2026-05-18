# Registry Rust Build Blocker

## Goal

Make `contracts/registry-rust` buildable using the official Miden Rust smart
contract path, without guessing a `Cargo.toml` or project template.

## Current Registry Source

The source skeleton is:

- `contracts/registry-rust/src/lib.rs`
- `contracts/registry-rust/README.md`

It uses the official Rust component shape:

```rust
use miden::{component, StorageMap, StorageMapAccess, Word};

#[component]
struct NameRegistry {
    #[storage(description = "name_hash to owner account word")]
    names: StorageMap,
}
```

## Official Setup Found

Current Miden installation docs describe the `midenup` path:

```bash
cargo install midenup
midenup init
midenup install stable
miden new my-test-project
```

The compiler docs also describe `cargo-miden`:

```bash
rustup toolchain install nightly-2025-07-20
git clone https://github.com/0xMiden/compiler
cd compiler
cargo install --path tools/cargo-miden --locked
cargo miden new foo
cargo miden build --release
```

The current `cargo-miden` crate metadata confirms:

```text
cargo-miden = "0.8.1"
rust-version: 1.92
repository: https://github.com/0xMiden/compiler
```

## Local Toolchain State

Before installation attempts:

```text
rustc 1.95.0 (59807616e 2026-04-14)
cargo 1.95.0 (f2d3ce0bd 2026-03-21)
stable-x86_64-pc-windows-msvc (active, default)
```

No local Miden tools were installed:

```text
cargo miden --help
error: no such command: `miden`
```

No `miden`, `midenc`, or `cargo-miden` command was found on PATH.

## Installation Attempts

### `cargo install midenup`

Command:

```bash
cargo install midenup
```

Result:

```text
error[E0433]: cannot find `unix` in `os`
src/external.rs:56:47
<std::fs::Permissions as std::os::unix::fs::PermissionsExt>::from_mode(0o755)
```

Blocker:

`midenup v0.2.0` does not currently compile on this Windows/MSVC host because it
references Unix-only permissions APIs.

### `cargo install cargo-miden --locked`

Command:

```bash
cargo install cargo-miden --locked
```

Result on stable Rust:

```text
error[E0554]: #![feature] may not be used on the stable release channel
hashbrown-0.15.5/src/lib.rs
```

Blocker:

`cargo-miden` requires a nightly-capable dependency graph.

### `cargo +nightly-2025-07-20 install cargo-miden --locked`

Installed:

```bash
rustup toolchain install nightly-2025-07-20
```

Result:

```text
cannot install package `cargo-miden 0.8.1`, it requires rustc 1.92 or newer,
while the currently active rustc version is 1.90.0-nightly
```

Blocker:

The older compiler-doc nightly is now too old for `cargo-miden 0.8.1`.

### `cargo +nightly-2025-09-30 install cargo-miden --locked`

Installed:

```bash
rustup toolchain install nightly-2025-09-30
```

Result:

```text
nightly-2025-09-30-x86_64-pc-windows-msvc installed
rustc 1.92.0-nightly (dc2c3564d 2025-09-29)
```

Then:

```bash
cargo +nightly-2025-09-30 install cargo-miden --locked
```

Failed in `miden-core-lib`:

```text
Error: x project 'miden-core' is missing its manifest path
error: failed to run custom build command for `miden-core-lib v0.22.1`
```

### `cargo +nightly install --git https://github.com/0xMiden/compiler cargo-miden --locked`

Installed current nightly:

```bash
rustup toolchain install nightly
```

Result:

```text
nightly-x86_64-pc-windows-msvc installed
rustc 1.97.0-nightly (507271bc1 2026-05-17)
```

Then:

```bash
cargo +nightly install --git https://github.com/0xMiden/compiler cargo-miden --locked
```

Failed in `miden-core-lib`:

```text
Error: x project 'miden-core' is missing its manifest path
error: failed to run custom build command for `miden-core-lib v0.22.3`
```

## Why No `Cargo.toml` Was Added

The official docs say to create the Rust contract with the generated template:

```bash
cargo miden new name-registry-account
```

That template is the source of truth for:

- `Cargo.toml`
- crate type
- allocator setup
- panic strategy
- required Miden crate versions
- build metadata

Because `cargo-miden` could not be installed locally, the official template
could not be generated or inspected. Adding a hand-written `Cargo.toml` here
would guess dependencies and risk creating a fake build path.

## Exact Blocker

The Rust registry path is blocked on installing one of the official Miden project
generators on this host:

- `midenup` fails on Windows/MSVC due Unix-only permission APIs.
- `cargo-miden` from crates.io and from the compiler repo both fail during
  `miden-core-lib` build with:

```text
project 'miden-core' is missing its manifest path
```

## Next Safe Options

1. Use WSL/Linux or macOS and install via:

```bash
cargo install midenup
midenup init
midenup install stable
miden new name-registry-account
```

2. Or use a local clone of `https://github.com/0xMiden/compiler` and install
   from the workspace path exactly as the older compiler docs describe:

```bash
git clone https://github.com/0xMiden/compiler
cd compiler
cargo +nightly install --path tools/cargo-miden --locked
```

3. After `cargo miden` or `miden` project generation works, copy
   `contracts/registry-rust/src/lib.rs` into the generated contract crate and
   run:

```bash
cargo miden build --release
```

or the equivalent `miden build` command from the generated project.
