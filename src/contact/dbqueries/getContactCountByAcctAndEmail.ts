
// Note DO NOT USE CAMELCASE
export function getContactCountByAcctAndEmail (accountId, email) {
  let sqlstatment = 
  `SELECT count(*) 
   FROM contact 
   INNER JOIN contact_acct_rel on contact.id = contact_acct_rel.contact_id
   WHERE account_id = ${accountId} and email = '${email}';
`
return sqlstatment;
}