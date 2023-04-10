/**
 * Result object returned by DeleteQueryBuilder execution.
 */
export class DeleteTransactionResult {
  affected: number | null;
  successful?:   boolean;
}