import { Contact } from "../entities/contact.entity";
import { ContactSource } from "../entities/contact.source.entity";
import { ContactAcctRel } from "../entities/contact.acct.rel.entity";

/**
 * ContactAggregate is an object with all the aggregate relations.
 */
export type ContactAggregate = {
  contact:          Contact;
  contactSource?:   ContactSource;
  contactAcctRel?:  ContactAcctRel;
}

