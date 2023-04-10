
// Note DO NOT USE CAMELCASE
export function getContactByAcctAndEmail (accountId, email) {
  let sqlstatment = 
  `SELECT contact.id as contact_id, version,  first_name, last_name, email, mobile_phone, 
    contact_acct_rel.id as acct_rel_id, contact_acct_rel.account_id as account_id,
    contact_source.id as source_id, source_type, source_name
    FROM contact 
    FULL OUTER JOIN contact_acct_rel on contact.id = contact_acct_rel.contact_id
    FULL OUTER JOIN contact_source   on contact.id = contact_source.contact_id
    WHERE account_id = ${accountId} and email = '${email}';
`
return sqlstatment;
}