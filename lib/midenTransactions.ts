import type { MidenAccountId, MidenClient } from "@/lib/midenClient";

export type ConsumeFirstAvailableNoteResult = {
  noteId: string;
  transactionId: string;
};

export async function consumeFirstAvailableNote(
  client: MidenClient,
  accountId: MidenAccountId,
): Promise<ConsumeFirstAvailableNoteResult> {
  await client.syncState();

  const notes = await client.getConsumableNotes(accountId);

  if (notes.length === 0) {
    throw new Error(
      "No consumable notes found for this account. Fund it from the Miden faucet first, then try again.",
    );
  }

  const noteId = notes[0].inputNoteRecord().id().toString();
  const request = client.newConsumeTransactionRequest([noteId]);
  const transactionId = await client.submitNewTransaction(accountId, request);

  await client.syncState();

  return {
    noteId,
    transactionId: transactionId.toHex(),
  };
}
