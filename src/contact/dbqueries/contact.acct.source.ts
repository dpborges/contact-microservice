import { QueryOptions } from "../types";
import { logStart, logStop } from '../../utils/trace.log'

const logTrace = true;

/**
 * Generic query to return all contacts by default. Query joins the contacts, 
 * contactsAcctRel, and contactSource tables. If you pass in the countOnly option,
 * it will suppress the orderby and limit/offset parameters and use select count(*) instead
 * of using the select with the fieldProjection.
 * @param queryOptions 
 * @returns sqlstatement
 */
// Note DO NOT USE CAMELCASE. Same holds true or where clause and orderByField.
export function contactAcctSourceSql (queryOptions?: QueryOptions) {
  const methodName = 'contactAcctSourceSql';
  logTrace && logStart([methodName, 'queryOptions'], arguments)

  const getCount = true;

  /* initialize ther sqlClauses string used to concat multiple clauses together  */
  let sqlClauses = '';

  /* if queryOptions are provided, build up sqlClauses string   */
  if (queryOptions) {
    console.log(" INSIDE QUERY OPTIONS CONDITION")
    let whereClause = queryOptions.whereClause ? queryOptions.whereClause : '';
    let sortOrder   = queryOptions.sortOrder ? queryOptions.sortOrder : 'ASC'; /* default to ASC if sortOrder not provided */
    let orderBy     = queryOptions.orderByField ? `ORDER BY ${queryOptions.orderByField} ${sortOrder} ` : '';
    let limit  = queryOptions.paginationValues ? queryOptions.paginationValues.limit : '';
    let offset = queryOptions.paginationValues ? queryOptions.paginationValues.offset : '';
    let limitAndOffset = limit ? `LIMIT ${limit} OFFSET ${offset}` : '';

    /* provide only sql clauses that were provided in the queryOptions */
    if (whereClause) { sqlClauses = sqlClauses + whereClause };
    if (sortOrder && !getCount) { sqlClauses = sqlClauses + ' ' + orderBy };
    if (limit && offset && !getCount) { sqlClauses = sqlClauses + ' ' + limitAndOffset };
    console.log(" THIS IS SQL CLAUSES ", sqlClauses)
  }

  /* define sql statmement */
  let fieldProjection = `contact.id as id, version,  first_name, last_name, email, mobile_phone, 
  contact_acct_rel.id as acct_rel_id, contact_acct_rel.account_id as account_id,
  contact_source.id as source_id, source_type, source_name`;

  let countProjection = `count(*)`;
  let projection = getCount ? countProjection : fieldProjection;

  let sqlstatment = 
  `SELECT ${projection}
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
