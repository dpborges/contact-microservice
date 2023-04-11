export interface MessageHeader {
  sessionId?:    string;   /* allows downstream consumer to get access to session information */
  accountId?:    number;
  outboxId?:     number;   /* allows downstream consumer to update outbox event status using outboxId */
  userId?:       string;


  // [key: string]: string;   /* allows for adding additional string properties to header */
  // [key: string]: number;   /* allows for adding additional number properties to header */
}