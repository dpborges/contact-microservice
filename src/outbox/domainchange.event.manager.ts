import { UpdateEventStatusCmdPayload } from './events/commands/update.status.payload';
import { OutboxService } from './outbox.service';
// import { ContactCreatedEvent } from '../events/contact/domainChanges/contact-created-event';
import { Repository } from 'typeorm';
import { Injectable, Inject } from '@nestjs/common';
// import { CreateContactEvent } from '../events/contact/commands/create-contact-event';
// import { ServerError } from '../common/errors/server.error';
// import { ClientErrorReasons } from '../common/errors/client.error.standard.text';
import { PublishUnpublishedEventsCmdPayload } from './events/commands'; 
import { ContactOutbox } from './entities/contact.outbox.entity';
// import { OutboxStatus } from './outbox.status.enum';
// import { Subjects } from '../events/contact/domainChanges';
// import { SubjectAndPayload } from './types/subject.and.payload';
import { CustomNatsClient } from '../custom.nats.client.service';
import { OutboxCommands } from './events/commands';
import { RepoToken } from 'src/db-providers/repo.token.enum';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DomainChangeEventManager {

  private domainChangeEventsEnabled: boolean = false;
  
  constructor(
    // private outboxService: OutboxService,
    private customNatsClient: CustomNatsClient,
    private configService: ConfigService,
    @Inject(RepoToken.CONTACT_OUTBOX_REPOSITORY) private contactOutboxRepository: Repository<ContactOutbox>,
  ) {
    /* set domainChangeEventsEnabled flag */
    if (this.configService.get('PUBLISH_DOMAIN_CHANGE_EVENTS') === "true") {
      this.domainChangeEventsEnabled = true ;
    }
  }

  /**
   * Updates status on contact utbox repository
   * @param updateEventStatusCmdPayload 
   */
  async updateStatus(updateEventStatusCmdPayload: UpdateEventStatusCmdPayload): Promise<void> {
    let { outboxId, status } = updateEventStatusCmdPayload;
    
    /* set status where id = outboxId */
    const { affected: rowsUpdated } = await this.contactOutboxRepository.update(outboxId, { status });
    if (rowsUpdated !== 1) {
      //LOG WARNING
      console.log(`WARNING: Expected 1 rowUpdated but received ${rowsUpdated} when changing status for outboxId:${outboxId} `)
    }
  }

  /* Sends command to outbox to publish unpublished events in outbox for a given account */
  async triggerOutboxForAccount(accountId: number): Promise<any> {
    
    /* If flag is disabled to publish domain change events, return */
    if (!this.domainChangeEventsEnabled) {  
      return;  
    }

    /* publish domain events for account */
    let commandPayload: PublishUnpublishedEventsCmdPayload = { accountId }
    let commandResult = await this.customNatsClient.sendCommand(
      OutboxCommands.publishUnpublishedEvents, commandPayload
    );
    return commandResult;
  }
  
}