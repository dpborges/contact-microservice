import { createConnection } from 'typeorm';
import { Repository, DataSource } from 'typeorm';
import { Injectable, Inject } from '@nestjs/common';
import { RepoToken } from '../../db-providers/repo.token.enum';
import { ContactOutbox } from '../entities/contact.outbox.entity';

// Class is responsible for saving contact domain change events to outbox.
@Injectable()
export class SaveOutboxTransaction {
  
  constructor(
    // @Inject(RepoToken.DATA_SOURCE) private dataSource: DataSource,
    @Inject(RepoToken.CONTACT_OUTBOX_REPOSITORY) private contactOutboxRepository: Repository<ContactOutbox>
  ) {}
  
  async save(
      contactOutboxInstance: ContactOutbox
    ): Promise<any> {

    /* save outbox message entry  */
    const saveResult = await this.contactOutboxRepository.save(contactOutboxInstance)
    return saveResult;
  };


}