export type MidenClient = Awaited<
  ReturnType<typeof import("@miden-sdk/miden-sdk/lazy").MidenClient.createTestnet>
>;
export type MidenAccount = Awaited<ReturnType<MidenClient["accounts"]["create"]>>;
export type MidenAccountId = string;

export async function createMidenClient(): Promise<MidenClient> {
  if (typeof window === "undefined") {
    throw new Error("MidenClient can only be created in the browser.");
  }

  const { MidenClient } = await import("@miden-sdk/miden-sdk/lazy");
  await MidenClient.ready();
  return MidenClient.createTestnet();
}

export async function createOrLoadAccount(client: MidenClient): Promise<{
  account: MidenAccount;
  accountId: string;
  accountIdObject: MidenAccountId;
  source: "loaded" | "created";
}> {
  if (typeof window === "undefined") {
    throw new Error("Miden account can only be created or loaded in the browser.");
  }

  const accountHeaders = await client.accounts.list();

  // Next step: add a registry account/contract client once name writes leave mock state.
  if (accountHeaders.length > 0) {
    const accountId = accountHeaders[0].id().toString();
    const account = await client.accounts.get(accountId);

    if (account) {
      return {
        account,
        accountId,
        accountIdObject: accountId,
        source: "loaded",
      };
    }
  }

  const account = await client.accounts.create();
  const accountId = account.id().toString();

  return {
    account,
    accountId,
    accountIdObject: accountId,
    source: "created",
  };
}
