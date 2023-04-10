// Note DO NOT USE CAMELCASE
export function contactAcctSql (whereClause) {
  let sqlstatment = 
  `SELECT contact.id as contact_id, version,  first_name, last_name, mobile_phone, 
      contact_acct_rel.id as acct_rel_id, contact_acct_rel.account_id as account_id
   FROM contact 
   INNER JOIN contact_acct_rel on contact.id = contact_acct_rel.contact_id
   ${whereClause};
`
return sqlstatment;
}