import { PaginationQuery } from "./pagination.query"
/**
 * @example
 * filterBy - 'acccountId=1234,firstName=john' 
 * orderByField - is a single field like 'id'  or multiple fields like 'accountId, id'
 * sortOrder - ASC | DESC
 * paginationValues - { limit: 10, offset: 10}
 * NOTE: whereClause gets populated by converting filterBy string to a where clause before
 * calling the SQL. This is typically done in the <domain>.query.service
 */
export type QueryOptions = { 
   filterBy?: string;  
   whereClause?: string;  
   orderByField?: string; 
   sortOrder?: string; 
   paginationValues?: PaginationQuery;
   countOnly?: boolean;
};



