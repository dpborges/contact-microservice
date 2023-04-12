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
import { DeleteResult } from 'typeorm';
import { DeleteTransactionResult } from './types/delete.transaction.result';

// Class is responsible for saving aggregate entities as a one transaction.
// If an outbox is include in the within the AggregateEntities object, it will included in transaction.
// Persistent rules are handled in the domain aggregate class
@Injectable()
export class DeleteContactTransaction {
  
  constructor(
    @Inject(RepoToken.DATA_SOURCE) private dataSource: DataSource,
    @Inject(RepoToken.CONTACT_REPOSITORY) private contactRepository: Repository<Contact>,
    @Inject(RepoToken.CONTACT_SOURCE_REPOSITORY) private contactSourceRepository: Repository<ContactSource>,
    @Inject(RepoToken.CONTACT_ACCT_REL_REPOSITORY) private contactAcctRelRepository: Repository<ContactAcctRel>,
  ) {}
  
  async delete(
      contactAggregate: ContactAggregate
      // headerInfo: 
    ): Promise<DeleteTransactionResult> {
    /* establish connection  */
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    /* destructure Aggregate Entities  */
    let { contact, contactSource, contactAcctRel } = contactAggregate;
    
    /* init deleteResult */
    let deleteAggregateRootResult: DeleteResult; 
    let deleteTransactionResult:   DeleteTransactionResult = { affected: 0, successful: false };

    /* start transaction */
    await queryRunner.startTransaction();
    
    /* save aggregate  */
    try {
      if (contact) {
        /* delete contact  */
        deleteAggregateRootResult = await this.contactRepository.delete(contactAggregate.contact);
        console.log("deleteAggregateRootResult 1 ", deleteAggregateRootResult);
      } 
      if (contactSource) {
        /* assign contact id to contactSource to establish 1:1 relationship */
        contactSource.contactId = contact.id;
        /* delete contactSource */
        await this.contactSourceRepository.delete(contactAggregate.contactSource);
      }
      if (contactAcctRel) {
        /* delete contact -> account relationship, where one contact may exist in multiple accounts */
        contactAcctRel.contactId = contact.id;
        await this.contactAcctRelRepository.delete(contactAggregate.contactAcctRel)
      } 
      await queryRunner.commitTransaction();

      /* populate return object */
      deleteTransactionResult.affected = deleteAggregateRootResult.affected;
      deleteTransactionResult.successful = true;

    } catch (err) {
      /* set successful propert to false */
      deleteTransactionResult.affected = deleteAggregateRootResult.affected;
      deleteTransactionResult.successful = false;
      /* rollback changes  */
      await queryRunner.rollbackTransaction();
    } finally {
      // release query runner which is manually created:
      await queryRunner.release();
    }
    return deleteTransactionResult;
  };


}