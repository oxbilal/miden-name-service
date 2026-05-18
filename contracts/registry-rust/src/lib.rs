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
        // TODO: reject duplicates once the official empty/default Word check is confirmed.
        self.names.set(name_hash, owner);
    }

    pub fn resolve(&self, name_hash: Word) -> Word {
        self.names.get(&name_hash)
    }
}
