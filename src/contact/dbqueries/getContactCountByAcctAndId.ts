
// Note DO NOT USE CAMELCASE IN SQL STATEMENT
export function getContactCountByAcctAndId (accountId, id) {
  
  let sqlstatment = 
  `SELECT count(*) 
   FROM contact 
   INNER JOIN contact_acct_rel on contact.id = contact_acct_rel.contact_id
   WHERE account_id = ${accountId} and contact.id = ${id};
`
return sqlstatment;
}