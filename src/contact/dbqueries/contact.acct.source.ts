import { QueryOptions } from "../types";
import { logStart, logStop } from '../../utils/trace.log'

const logTrace = true;

// Note DO NOT USE CAMELCASE. Same holds true or where clause and orderByField.
export function contactAcctSourceSql (queryOptions?: QueryOptions) {
  const methodName = 'contactAcctSourceSql';
  logTrace && logStart([methodName, 'queryOptions'], arguments)

  /* initialize individual sqlClauses string   */
  let sqlClauses = '';

  /* build up sqlClauses string if queryOptions are provided  */
  if (queryOptions) {
    console.log(" INSIDE QUERY OPTIONS CONDITION")
    let whereClause = queryOptions.whereClause ? queryOptions.whereClause : '';
    let sortOrder   = queryOptions.sortOrder ? queryOptions.sortOrder : 'ASC'; /* default to ASC if sortOrder not provided */
    let orderBy     = queryOptions.orderByField ? `ORDER BY ${queryOptions.orderByField} ${sortOrder}` : '';
    let limit  = queryOptions.paginationValues ? queryOptions.paginationValues.limit : '';
    let offset = queryOptions.paginationValues ? queryOptions.paginationValues.offset : '';
    let limitAndOffset = limit ? `LIMIT ${limit} OFFSET ${offset}` : '';

    /* provide only sql clauses that were provide in queryOptions */
    if (whereClause) { sqlClauses = sqlClauses + whereClause };
    if (orderBy) { sqlClauses = sqlClauses + ' ' + orderBy };
    if (limit && offset) { sqlClauses = sqlClauses + ' ' + limitAndOffset };
    console.log(" THIS IS SQL CLAUSES ", sqlClauses)
  }

  /* define sql statmement */
  let sqlstatment = 
  `SELECT contact.id as id, version,  first_name, last_name, email, mobile_phone, 
      contact_acct_rel.id as acct_rel_id, contact_acct_rel.account_id as account_id,
      contact_source.id as source_id, source_type, source_name
    FROM contact 
    FULL OUTER JOIN contact_acct_rel on contact.id = contact_acct_rel.contact_id
    FULL OUTER JOIN contact_source   on contact.id = contact_source.contact_id
   ${sqlClauses}
  `
  logTrace && logStop(methodName, 'sqlStatment', sqlstatment)
  return sqlstatment;
}


/* define sql statmement */
// let sqlstatment = 
// `SELECT contact.id as contact_id, version,  first_name, last_name, mobile_phone, 
//     contact_acct_rel.id as acct_rel_id, contact_acct_rel.account_id as account_id,
//     contact_source.id as source_id, source_type, source_name
//  FROM contact 
//  INNER JOIN contact_acct_rel on contact.id = contact_acct_rel.contact_id
//  INNER JOIN contact_source   on contact.id = contact_source.contact_id 
//  ${whereClause}
//  ${orderBy} 
//  ${limitAndOffset};
// `
