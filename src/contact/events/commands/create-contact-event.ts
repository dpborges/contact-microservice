import { MessageHeader } from '../common/message.header';

export interface CreateContactPayload {
  // id:           number;  // keep id as placeholder to set it after creating aggregate 
  accountId:    number;  //      so we can set in createdEvent so downstream services can consume */
  email:        string;
  firstName:    string;
  lastName:     string;
  mobilePhone:  string;
  sourceType:   string;
  sourceName:   string;
}

export interface CreateContactEvent {
  header?: MessageHeader;
  message: CreateContactPayload ;
}