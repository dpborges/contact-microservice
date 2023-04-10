 /* Note, outboxId is used by outbox handler. Outbox handler appends the outbox id
    to the message when publishing from outbox. This allows downstream consumers
    to update status using the outboxId */
import { MessageHeader } from "src/events/common/message.header";

export interface ContactUpdatedPayload {
  id:           number;
  version:      number;
  accountId:    number;
  email?:       string;
  firstName?:   string;
  lastName?:    string;
  mobilePhone?: string;
}

export interface ContactUpdatedEvent {
  header:   MessageHeader;
  message:  ContactUpdatedPayload;
}

