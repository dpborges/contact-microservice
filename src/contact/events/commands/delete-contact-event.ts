import { MessageHeader } from '../common/message.header';

export interface DeleteContactPayload {
  id:           number;  
  // accountId:    number;  
}

export interface DeleteContactEvent {
  header?: MessageHeader;
  message: DeleteContactPayload ;
}