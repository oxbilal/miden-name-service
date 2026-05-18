import type { MidenAccountId, MidenClient } from "@/lib/midenClient";

export type ConsumeFirstAvailableNoteResult = {
  noteId: string;
  transactionId: string;
};

export async function consumeFirstAvailableNote(
  client: MidenClient,
  accountId: MidenAccountId,
): Promise<ConsumeFirstAvailableNoteResult> {
  await client.sync();

  const notes = await client.notes.listAvailable({ account: accountId });

  if (notes.length === 0) {
    throw new Error(
      "No consumable notes found for this account. Fund it from the Miden faucet first, then try again.",
    );
  }

  const note = notes[0];
  const result = await client.transactions.consume({
    account: accountId,
    notes: [note],
  });

  await client.sync();

  return {
    noteId: note.id().toString(),
    transactionId: result.txId.toString(),
  };
}
