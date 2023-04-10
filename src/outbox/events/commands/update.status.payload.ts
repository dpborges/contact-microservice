/* command interface to process unpublished events for a given accountId */
export interface UpdateEventStatusCmdPayload {
  outboxId:   number;
  status:     string;
}