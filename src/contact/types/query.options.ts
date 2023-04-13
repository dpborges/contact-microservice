import { PaginationQuery } from "./pagination.query"
/**
 * @example
 * whereClause - 'WHERE acccount_id = 1234' 
 * orderByField - is a single field like 'id'  or multiple fields like 'accountId, id'
 * sortOrder - ASC | DESC
 * paginationValues - { limit: 10, offset: 10}
 */
export type QueryOptions = { 
   whereClause?: string;  
   orderByField?: string; 
   sortOrder?: string; 
   paginationValues?: PaginationQuery;
};

