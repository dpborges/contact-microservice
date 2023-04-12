import { UpdateEventStatusCmdPayload } from './events/commands/update.status.payload';
import { OutboxService } from './outbox.service';
import { ContactCreatedEvent } from '../contact/events/domainChanges/contact-created-event';
import { Repository } from 'typeorm';
import { Injectable, Inject } from '@nestjs/common';
import { CreateContactEvent } from '../contact/events/commands/create-contact-event';
import { ServerError } from '../common/errors/server/server.error';
import { ClientErrorReasons } from '../common/errors/client/client.error.reasons';
// import { PublishUnpublishedEventsCmdPayload } from '../events/outbox/commands';
import { RepoToken } from '../db-providers/repo.token.enum';
import { ContactOutbox } from './entities/contact.outbox.entity';
import { OutboxStatus } from './outbox.status.enum';
import { Subjects } from '../contact/events/domainChanges';
import { SubjectAndPayload } from './types/subject.and.payload';
import { CustomNatsClient } from '../custom.nats.client.service';
// import { EventStatusUpdater } from './event.status.updater';
import { DomainChangeEventManager } from './domainchange.event.manager';


@Injectable()
export class DomainChangeEventPublisher {
  
  constructor(
    // private outboxService: OutboxService,
    private customNatsClient: CustomNatsClient,
    // private eventStatusUpdater: EventStatusUpdater,
    private domainChangeEventManager: DomainChangeEventManager,
    @Inject(RepoToken.CONTACT_OUTBOX_REPOSITORY) private contactOutboxRepository: Repository<ContactOutbox>,
  ) {}
  
  /**
   * Publishes array of event instances { subject, payload } to messaging platform.
   * This method is Event Type agnostic. It simply takes the array of subject and payload 
   * from the outbox table, and publishes those events.
   * @param eventInstances 
   * @returns 
   */
  async publishEvents(eventInstances: Array<SubjectAndPayload>): Promise<void> {
    console.log(">>>> Inside publishEvents method");

    eventInstances.forEach(async (eventInstance) => {
      console.log("    eventInstance ", eventInstance)
      let subject = eventInstance.subject;
      let payload = eventInstance.payload;
      const { outboxId } = payload.header;
      
      /* publish event */
      let natsResult = await this.customNatsClient.publishEvent(subject, payload);

      console.log(`MS -publishing Event: ${natsResult}`);
      
      /* update event status to published */
      if (this.isAcknowledged(natsResult)) {
        const status = OutboxStatus.published;
        const cmdPayload: UpdateEventStatusCmdPayload = { outboxId,  status }
        await this.domainChangeEventManager.updateStatus(cmdPayload)
      } else {
        console.log(`WARNING: Nats did not send back acknowledgement when publishing event - outboxId: ${outboxId}`)
      }
    })
  }
  
  
 /**
  * Create outbox instance for contactCreatedEvent 
  * @param createContactEvent 
  * @returns contactCreatedEventOutboxInstance
  */
  // generateContactCreatedInstances(createContactEvent: CreateContactEvent): ContactOutbox {
  //   console.log(">>> Inside OutboxService.generateDomainCreatedInstances ")
  //   // console.log("    contactCreatedEvent ",  createContactEvent);
  //   const { userId }    = createContactEvent.header;
  //   const { accountId } = createContactEvent.message;

  //   const serializedContactCreatedEvent = this.generateContactCreatedEvent(createContactEvent);
  //   const contactCreatedEventOutboxInstance:ContactOutbox = this.contactOutboxRepository.create({
  //     accountId, 
  //     subject: Subjects.ContactCreated,
  //     payload: serializedContactCreatedEvent,
  //     userId,
  //     status: OutboxStatus.unpublished
  //  });
  //  return contactCreatedEventOutboxInstance
  // }

  /**
   * Maps createContactEvent to createdContactEvent
   * @param createContactEvent 
   * @returns serializedContactCreatedEvent
   */
  generateContactCreatedEvent(createContactEvent): string {
    /* destructure properties from createDomainEvent to selectively add to DomainCreatedEvent */
    const { accountId, sessionId, userId } = createContactEvent.header;
    const { email, firstName, lastName, mobilePhone } = createContactEvent.message;

    /* use properties from createDomain event to define domainCreatedEvent   */
    const contactCreatedEvent: ContactCreatedEvent = { 
      header:  {sessionId, userId, accountId },
      message: { email, firstName, lastName, mobilePhone }
    }
    /* serialize event  */
    const serializedContactCreatedEvent: string = JSON.stringify(contactCreatedEvent);

    return serializedContactCreatedEvent;
  }

  // *********************************************************
  // Helpers
  // *********************************************************
  
  // Checks that the string 'acknowledged' is in the result when you publishe an event 
  isAcknowledged(natsResult): boolean {
    let acknowledged = true;
    if (!JSON.stringify(natsResult).includes('acknowledged')) {
      acknowledged = false;
    }
    return acknowledged;
  }

}