export type MidenClient = Awaited<
  ReturnType<typeof import("@demox-labs/miden-sdk").WebClient.createClient>
>;
export type MidenAccount = Awaited<ReturnType<MidenClient["newWallet"]>>;

const BASIC_AUTH_SCHEME_ID = 0;

export async function createMidenClient(): Promise<MidenClient> {
  if (typeof window === "undefined") {
    throw new Error("Miden client can only be created in the browser.");
  }

  const { WebClient } = await import("@demox-labs/miden-sdk");
  return WebClient.createClient();
}

export async function createOrLoadAccount(client: MidenClient): Promise<{
  account: MidenAccount;
  accountId: string;
  source: "loaded" | "created";
}> {
  if (typeof window === "undefined") {
    throw new Error("Miden account can only be created or loaded in the browser.");
  }

  const { AccountStorageMode } = await import("@demox-labs/miden-sdk");
  const accountHeaders = await client.getAccounts();

  // Next step: add a registry account/contract client once name writes leave mock state.
  if (accountHeaders.length > 0) {
    const accountId = accountHeaders[0].id();
    const account = await client.getAccount(accountId);

    if (account) {
      return {
        account,
        accountId: account.id().toString(),
        source: "loaded",
      };
    }
  }

  const account = await client.newWallet(
    AccountStorageMode.private(),
    true,
    BASIC_AUTH_SCHEME_ID,
  );

  return {
    account,
    accountId: account.id().toString(),
    source: "created",
  };
}
