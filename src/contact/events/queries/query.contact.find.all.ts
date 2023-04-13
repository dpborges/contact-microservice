import { MessageHeader } from '../common/message.header';
import { PaginationQuery } from 'src/contact/types';

export interface QueryContactFindAllPayload {
  paginationValues?:  PaginationQuery
}

export interface QueryContactFindAll {
  header?: MessageHeader;
  message: QueryContactFindAllPayload ;
}