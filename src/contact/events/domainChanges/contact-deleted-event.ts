 /* Note, outboxId is used by outbox handler. Outbox handler appends the outbox id
    to the message when publishing from outbox. This allows downstream consumers
    to update status using the outboxId */
import { MessageHeader } from "src/contact/events/common/message.header";

export interface ContactDeletedPayload {
  id:           number;
  // accountId:    number;
}

export interface ContactDeletedEvent {
  header:   MessageHeader;
  message:  ContactDeletedPayload;
}

