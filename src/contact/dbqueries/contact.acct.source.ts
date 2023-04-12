
import { QueryOptions } from "../types";

// Note DO NOT USE CAMELCASE. Same holds true or where clause and orderByField.
export function contactAcctSourceSql (queryOptions?: QueryOptions) {
  let { whereClause, orderByField, sortOrder, pagination } = queryOptions;

  /* set values if passed as arguments, othewise leave values empty, or in the case of 
     pagination, if zero  */
  whereClause = whereClause ? whereClause : '';
  let orderBy  = orderByField ? `ORDER BY ${orderByField} ${sortOrder}` : '';
  let paginationParms = pagination ? pagination : '';

  /* define sql statmement */
  let sqlstatment = 
  `SELECT contact.id as contact_id, version,  first_name, last_name, mobile_phone, 
      contact_acct_rel.id as acct_rel_id, contact_acct_rel.account_id as account_id,
      contact_source.id as source_id, source_type, source_name
   FROM contact 
   INNER JOIN contact_acct_rel on contact.id = contact_acct_rel.contact_id
   INNER JOIN contact_source   on contact.id = contact_source.contact_id 
   ${whereClause}
   ${orderBy} 
   ${paginationParms};
`
return sqlstatment;
}