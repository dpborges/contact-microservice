import { MessageHeader } from '../common/message.header';
import { PaginationQuery } from 'src/contact/types';

export interface QueryContactFindAllPayload {
  paginationValues?:  PaginationQuery;
  filterBy?: string;
  orderByField?: string;
  sortOrder?: string;
}

export interface QueryContactFindAll {
  header?: MessageHeader;
  message: QueryContactFindAllPayload ;
}