import { MessageHeader } from '../../common/message.header';

export interface UpdateContactPayload {
  id:            number;
  accountId:     number;
  email:         string;
  firstName?:    string;
  lastName?:     string;
  mobilePhone?:  string;
  sourceType?:   string;
  sourceName?:   string;
}

export interface UpdateContactEvent {
  header?: MessageHeader;
  message: UpdateContactPayload ;
}