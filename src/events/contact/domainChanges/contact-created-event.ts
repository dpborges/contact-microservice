 /* Note, outboxId is used by outbox handler. Outbox handler appends the outbox id
    to the message when publishing from outbox. This allows downstream consumers
    to update status using the outboxId */
import { MessageHeader } from "src/events/common/message.header";

export interface ContactCreatedPayload {
  id?:          number;
  // accountId:    number;
  version?:     number;    /* make optional as its not needed in the contactCreate event */
  email:        string;
  firstName:    string;
  lastName:     string;
  mobilePhone:  string;
}

export interface ContactCreatedEvent {
  header:   MessageHeader;
  message:  ContactCreatedPayload;
}

