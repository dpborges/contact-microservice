import { ContactAggregate } from '../types';
// import { CreateDomainTransaction } from './create.domain.transaction';
import { createConnection } from 'typeorm';
// import { CreateContactDto } from '../dtos/create.contact.dto';
import { Repository, DataSource } from 'typeorm';
import { Injectable, Inject } from '@nestjs/common';
import { Contact } from '../entities/contact.entity';
import { ContactSource } from '../entities/contact.source.entity';
import { ContactAcctRel } from '../entities/contact.acct.rel.entity';
import { RepoToken } from '../../db-providers/repo.token.enum';
import { ContactCreatedEvent } from '../events/domainChanges';

// Class is responsible for saving aggregate entities as a one transaction.
// If an outbox is include in the within the AggregateEntities object, it will included in transaction.
// Persistent rules are handled in the domain aggregate class
@Injectable()
export class CreateContactTransaction {
  
  constructor(
    @Inject(RepoToken.DATA_SOURCE) private dataSource: DataSource,
    @Inject(RepoToken.CONTACT_REPOSITORY) private contactRepository: Repository<Contact>,
    @Inject(RepoToken.CONTACT_SOURCE_REPOSITORY) private contactSourceRepository: Repository<ContactSource>,
    @Inject(RepoToken.CONTACT_ACCT_REL_REPOSITORY) private contactAcctRelRepository: Repository<ContactAcctRel>,
  ) {}
  
  async create(
      contactAggregate: ContactAggregate
      // headerInfo: 
    ): Promise<ContactAggregate> {
    /* establish connection  */
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    /* destructure Aggregate Entities  */
    let { contact, contactSource, contactAcctRel } = contactAggregate;

    /* start transaction */
    await queryRunner.startTransaction();
    
    /* save aggregate  */
    try {
      if (contact) {
        /* save contact  */
        contactAggregate.contact = await this.contactRepository.save(contactAggregate.contact)
      } 
      if (contactSource) {
        /* assign contact id to contactSource to establish 1:1 relationship */
        contactSource.contactId = contact.id;
        /* save contactSource */
        contactAggregate.contactSource = await this.contactSourceRepository.save(contactAggregate.contactSource)
      }
      if (contactAcctRel) {
        /* create contact -> account relationship, where one contact may exist in multiple accounts */
        contactAcctRel.contactId = contact.id;
        contactAggregate.contactAcctRel = await this.contactAcctRelRepository.save(contactAggregate.contactAcctRel)
      } 
      await queryRunner.commitTransaction();
    } catch (err) {
      // rollback changes 
      await queryRunner.rollbackTransaction();
      // nullify aggregate root object
      contactAggregate.contact = null;
    } finally {
      // release query runner which is manually created:
      await queryRunner.release();
    }
    return contactAggregate;
  };


}