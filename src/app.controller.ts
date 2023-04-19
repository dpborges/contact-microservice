import { BaseError } from './common/errors/base.error';
import { CreateContactResponse } from './contact/responses/create.contact.response';
// import { genBeforeAndAfterImage } from 'src/utils/gen.beforeAfter.image';
// import { ContactAggregateEntities } from './contact/aggregate-types/contact.aggregate.type';
// import { EventStatusUpdater } from './outbox/event.status.updater';
import { OutboxStatus } from './outbox/outbox.status.enum';
import { OutboxService } from './outbox/outbox.service';
import { PublishUnpublishedEventsCmdPayload } from './outbox/events/commands';
import { NatsJetStreamContext } from '@nestjs-plugins/nestjs-nats-jetstream-transport';
import { Controller, Get, UseFilters } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { DeleteContactEvent } from './contact/events/commands';
import { ContactDeletedEvent } from './contact/events/domainChanges';
import { ExecuteCommand, ListenForEvent } from './decorators';
import {
  Ctx,
  EventPattern,
  MessagePattern,
  Payload,
} from '@nestjs/microservices';
import { AppService } from './app.service';
import { Subjects } from './contact/events/domainChanges'; 
// import { CreateOrderEvent, UpdateOrderEvent, DeleteOrderEvent } from './events/orders';
// import { OrderCreatedEvent, OrderUpdatedEvent, OrderDeletedEvent } from './events/orders';
// import { Patterns } from './commands/orders/patterns';
import { ExceptionFilter } from './common/filters';
import { Contact } from './contact/entities/contact.entity';
// import { CreateContactDto } from './contact/dtos/create.contact.dto';
// import { DomainMgtService } from './domain-mgt/domain-mgt.service';
// import { ContactService } from './contact/contact.service';
import { ContactCommand } from './contact/events/commands';
import { OutboxCommands } from './outbox/events/commands';
import { CreateContactEvent } from './contact/events/commands';
// import { ContactQueries } from './events/contact/queries';
// import { QueryContactByIdPayload } from './events/contact/queries';
import { ContactCreatedEvent } from './contact/events/domainChanges';
import { UpdateEventStatusCmdPayload } from './outbox/events/commands';
import { DomainChangeEventManager } from './outbox/domainchange.event.manager';
// import { ContactAggregate } from './contact/aggregate-types/contact.aggregate';
import { UpdateContactEvent } from './contact/events/commands';
import { ServerError } from './common/errors/server/server.error';
import { UpdateContactResponse } from './contact/responses/update.contact.response';
import { ContactUpdatedEvent } from './contact/events/domainChanges';
import { logStart, logStop, logStartVal } from './utils/trace.log';
import { ClientErrorReasons, ClientError } from './common/errors';
import { ContactAggregate } from './contact/types/contact.aggregate';
import { ContactService } from './contact/services/contact.service';
import { ContactQueries } from './contact/events/queries';
import { QueryContactFindAll } from './contact/events/queries';
// import { ContactQueryService } from './contact/services/contact.query.service';
import * as R from 'ramda';

const logTrace = false;

@UseFilters(new ExceptionFilter())
@Controller()
export class AppController {

  constructor(
    private readonly appService: AppService,
    private readonly contactService: ContactService,
    // private readonly contactQueryService: ContactQueryService,
    // private readonly contactAggregate: ContactAggregate
    private readonly outboxService:  OutboxService,
    // private readonly eventStatusUpdater: EventStatusUpdater,
    private readonly domainChangeEventManager: DomainChangeEventManager
    ) {}

  /* Rest End Point */
  @Get()
  home(): string {
    return `Welcome to webshop`;
  }

  @Get('test')
  test1(): any { 

    let replacement1 = "offset="
    let string1 = "&orderByField=email&sortOrder=ASC&limit=0&offset=0";
    let replaceString1 = string1.replace(/offset=\d{1,}/, replacement1);
    console.log("before ", string1)
    console.log("after  ", replaceString1)


     
  } // end of test1

  // To Be DELETED
  // @Get('load')
  // async getAggregateEntitiesById(): Promise<ContactAggregateEntities> {
  //   const contactId = 8;
  //   const result = await this.contactAggregate.getAggregateEntitiesById(contactId);
  //   console.log("CONTACT AGGREGATE ENTITIES ", result);
  //   return result;
  // }

  // To Be DELETED
  // @Get('update')
  // async updateAggregateById(): Promise<ContactAggregateEntities> {
  //   const contactId = 9;
  //   const updateObject = { mobilePhone: 2120001111, sourceType: "application", sourceName: "contentmgr" };
  //   const result: any = await this.contactService.updateAggregateById(contactId, updateObject)
  //   console.log("CONTACT AGGREGATE ENTITIES ", result);
  //   return result;
  // }


  //************************************************************** */
  // Contact Query Handlers
  //************************************************************** */

  @ExecuteCommand(ContactQueries.findAllContacts)
  async findAllContacts(
    @Payload() payload: QueryContactFindAll,
    @Ctx() context: NatsJetStreamContext
  ): Promise<any> {
    const subject = context.message.subject;
    console.log(`MS - Received ${ContactQueries.findAllContacts} in Orders Microservice`);
    console.log('MS - ....with payload', payload);
    let cmdResult: any = "Query reached microservice";

    cmdResult  =  await this.contactService.findAllContacts(payload);
    
    // Here you create Order and insert CreatedOrderEvent to the event database
    // as a single transaction. The publish flag will be false false

    // here you return the CreatedOrderEvent.
    return cmdResult;
  }

  // @ExecuteCommand(ContactQueries.findContactById)
  // async findContactById(
  //   @Payload() data: QueryContactByIdPayload,
  //   @Ctx() context: NatsJetStreamContext
  // ): Promise<any> {
  //   const subject = context.message.subject;
  //   console.log(`MS - Received ${ContactQueries.findContactById} in Orders Microservice`);
  //   console.log('MS - ....with payload', data);
  //   let cmdResult = "Query reached microservice";
  //   // const cmdResult: any  =  this.outboxService.publishUnpublishedEvents

  //   // Here you create Order and insert CreatedOrderEvent to the event database
  //   // as a single transaction. The publish flag will be false false

  //   // here you return the CreatedOrderEvent.
  //   return cmdResult;
  // }


  //************************************************************** */
  // Contact CUD Command Handlers
  //************************************************************** */
  // Create Contact
  @ExecuteCommand(ContactCommand.createContact)
  async createContactCommandHandler(
    @Payload() payload: CreateContactEvent,
    @Ctx() context: NatsJetStreamContext
  ): Promise<CreateContactResponse | BaseError> {
    const header = payload.header;
    const message = payload.message;
    const subject = context.message.subject;
    console.log(`MS - Received subject ${subject} on Contact Microservice`);
    console.log('MS - ....with data', payload);
    console.log('MS - ....with header', header);
    console.log('MS - ....with message', message);
    // let cmdResult: CreateContactResponse | BaseError;
    let cmdResult: any =  await this.contactService.createContact(payload)
    return cmdResult;
  }

  // Update Contact
  @ExecuteCommand(ContactCommand.updateContact)
  async updateContactCommandHandler(
    @Payload() payload: UpdateContactEvent,
    @Ctx() context: NatsJetStreamContext
  ): Promise<UpdateContactResponse | ServerError> {
    const header = payload.header;
    const message = payload.message;
    const subject = context.message.subject;
    console.log(`MS - Received subject ${subject} on Contact Microservice`);
    console.log('MS - ....with data', payload);
    console.log('MS - ....with header', header);
    console.log('MS - ....with message', message);
    const cmdResult: any  =  await this.contactService.updateContact(payload)
    // Here you create Order and insert CreatedOrderEvent to the event database
    // as a single transaction. The publish flag will be false false
    console.log("UPDATE CONTACT CMD RESULT ", cmdResult)
    // here you return the CreatedOrderEvent.
    // return "Completed Contact Update";
    return cmdResult;
  }

  @ExecuteCommand(ContactCommand.deleteContact)
  async deleteContactCommandHandler(
    @Payload() payload: DeleteContactEvent,
    @Ctx() context: NatsJetStreamContext
  ): Promise<any | ServerError> {
    const header = payload.header;
    const message = payload.message;
    const subject = context.message.subject;
    console.log(`MS - Received subject ${subject} on Contact Microservice`);
    console.log('MS - ....with data', payload);
    console.log('MS - ....with header', header);
    console.log('MS - ....with message', message);
    const cmdResult: any  =  await this.contactService.deleteContact(payload)
    // Here you create Order and insert CreatedOrderEvent to the event database
    // as a single transaction. The publish flag will be false false
    console.log("UPDATE CONTACT CMD RESULT ", cmdResult)
    // here you return the CreatedOrderEvent.
    // return "Completed Contact Update";
    return cmdResult;
  }


  //************************************************************** */
  // Outbox command handlers 
  //************************************************************** */
  /**
   * Publishes unpublished events in the outbox to the ESB for a given accountId. 
   * Since it a system command and not user driven event, no need to extract header 
   * properties
   * @param data - is an object with accountId (eg. { accountId })
   * @param context - standard Nats Jetstream context
   * @returns void
   */
  @ExecuteCommand(OutboxCommands.publishUnpublishedEvents)
  async publishUnpublishedEvents(
    @Payload() data: PublishUnpublishedEventsCmdPayload,
    @Ctx() context: NatsJetStreamContext
  ): Promise<any> {
    const subject = context.message.subject;
    const headers = context.message.headers;
    console.log(`MS - Received command ${OutboxCommands.publishUnpublishedEvents} on Outbox command handler`);
    console.log('MS - ....with payload', data);
    const cmdResult: any = this.outboxService.publishUnpublishedEvents(data)
    
    return `Processed command ${OutboxCommands.publishUnpublishedEvents}`;
  }

  @ExecuteCommand(OutboxCommands.updateStatus)
  async updateOutboxStatus(
    @Payload() commandPayload: UpdateEventStatusCmdPayload,
    @Ctx() context: NatsJetStreamContext
  ): Promise<any> {
    const methodName = 'updateStatus command';
    logTrace && logStartVal(methodName, 'commandPayload', JSON.stringify(commandPayload));

    const subject = context.message.subject;
    const headers = context.message.headers;
    console.log(`MS - Received command ${OutboxCommands.updateStatus} on Outbox command handler`);
    console.log('MS - ....with payload', commandPayload);
    const cmdResult: any = this.domainChangeEventManager.updateStatus(commandPayload);

    logTrace && logStop(methodName, 'cmdResult', cmdResult)
    return `Processed command ${OutboxCommands.updateStatus}`;
  }

  //************************************************************** */
  // Sample Domain Change Event Listeners
  //************************************************************** */
  // IMPORTANT: Listeners that are updating downstream data stores should be checking 
  // version sequence for their entities to ensure CUD events are processed in proper order.
  // SEE UDEMY LESSON 42 and refer to link below on Typeorm optimistic concurrency control
  // https://github.com/typeorm/typeorm/issues/3608
  // @EventPattern('order.created')

  // Mock Listener for ContactCreated Event and updates event status in outbox
  @ListenForEvent(Subjects.ContactCreated)
  public async contactCreatedHandler(
    @Ctx()  context: NatsJetStreamContext,
    @Payload() contactCreatedEvent: ContactCreatedEvent) 
  {
    const methodName = 'contactCreatedHandler';
    logTrace && logStartVal(methodName, 'contactCreatedEvent', JSON.stringify(contactCreatedEvent));
   
    const { header, message } = contactCreatedEvent;
    const { accountId, outboxId } = header;
    const { email, firstName, lastName } = message;
    
    /* Update event status to pending via service (request/reply) */
    await this.appService.updateEventStatus(outboxId, OutboxStatus.pending)

    /* Handle event here  */
    const successfullyProcessed = true;

    if (successfullyProcessed) {
      /* Update event status to processed  */
      await this.appService.updateEventStatus(outboxId, OutboxStatus.processed)

      /* acknowledge message */
      context.message.ack();  
    }
    
    logTrace && logStop(methodName, 'subject',  `${context.message.subject} processed`);
  }

  // Mock Listener for ContactUpdated Event and updates event status in outbox
  @ListenForEvent(Subjects.ContactUpdated)
  public async contactUpdatedHandler(
    @Ctx()  context: NatsJetStreamContext,
    @Payload() contactedUpdatedEvent: ContactUpdatedEvent) 
  {
    const methodName = 'contactUpdatedHandler';
    logTrace && logStartVal(methodName, 'contactedUpdatedEvent',JSON.stringify(contactedUpdatedEvent));

    const {header, message } = contactedUpdatedEvent;
    const { outboxId } = header;
    const { accountId, email, firstName, lastName } = message;
    
    /* Update event status to pending via service (request/reply) */
    await this.appService.updateEventStatus(outboxId, OutboxStatus.pending)

    /* Handle event here  */
    const successfullyProcessed = () => true;

    if (successfullyProcessed) {
      /* Update event status to processed  */
      await this.appService.updateEventStatus(outboxId, OutboxStatus.processed)

      /* acknowledge message */
      context.message.ack();  
    }

    logTrace && logStop(methodName, 'subject',  `${context.message.subject} processed`);
  }

   // Mock Listener for ContactDeleted Event and updates event status in outbox
   @ListenForEvent(Subjects.ContactDeleted)
   public async contactDeletedHandler(
     @Ctx()  context: NatsJetStreamContext,
     @Payload() contactDeletedEvent: ContactDeletedEvent) 
   {
     const methodName = 'contactDeletedHandler';
     logTrace && logStartVal(methodName, 'contactCreatedEvent', JSON.stringify(contactDeletedEvent));
    
     const { header, message } = contactDeletedEvent;
     const { outboxId, accountId } = header;
     const { id } = message;
     
     /* Update event status to pending via service (request/reply) */
     await this.appService.updateEventStatus(outboxId, OutboxStatus.pending)
 
     /* Handle event here  */
     const successfullyProcessed = true;
 
     if (successfullyProcessed) {
       /* Update event status to processed  */
       await this.appService.updateEventStatus(outboxId, OutboxStatus.processed)
 
       /* acknowledge message */
       context.message.ack();  
     }
     
     logTrace && logStop(methodName, 'subject',  `${context.message.subject} processed`);
   }
 
  
  //************************************************************** */
  // END OF Sample Listeners for Domain Changes
  //************************************************************** */

  //Event Listeners

  // @Get('/createcontact')
  // async createContact() {  
  //   console.log(">> Inside Create contact in controller")
  //   const contact  =  this.contactService.create(createContactDto)
  //   return contact;
  // }


  // @Get('/sandboxresults')
  // async sandbox() {  
  //   const isNull = value => value === null;

  //   let sampleAggregate = { a: null, b: null };

  //   /* transfer entity values into array */
  //   let entityArrayValues = [];
  //   Object.keys(sampleAggregate).forEach((key:string) => entityArrayValues.push(sampleAggregate[key]) );


  //   console.log(">> Below are entity values ")
  //   console.log(entityArrayValues);

  //   /* check if all values are null */
  //   let result = entityArrayValues.every(isNull)
  //   console.log(">> All aggregates null ", result)
  //   return 'completed displaying results';
  // }


  // @Get('/createaggregate')
  // async createAggregate() {  
  //   console.log(">> Inside Create contact in controller")
  //   const createContactDto = {
  //     accountId: 1001,
  //     firstName: 'Dan',
  //     lastName: 'Borges',
  //     mobilePhone: '9175554343'
  //   }
  //   return this.contactService.create(createContactDto)
  // }

  // @Get('/version')
  // async getAggregateVersion() {  
  //   console.log(">> Inside Create contact in controller")
  //   // return this.domainMgtService.test()
  //   return this.contactAggregateService.getVersion()
  // }

  // @Get('/test')
  // async callTest() {  
  //   console.log(">> Inside Create contact in controller")
  //   // return this.domainMgtService.test()
  //   return this.contact.test()
  // }

 

  // Response Side of Request Response Service - 
  // Hosted on Microservice instance -  Listens for 'sum' command
  // @MessagePattern({ cmd: 'sum' })
  // @ExecuteCommand({ cmd: 'sum' })
  // async accumulate(data: number[]): Promise<number> {
  //   console.log('command controller', data);
  //   return (data || []).reduce((a, b) => a + b);
  // }

  //************************************************************** */
  // Order command handlers and event listeners
  //************************************************************** */
  //Listens for command Pattern
  // @ExecuteCommand({ cmd: Patterns.CreateOrder })
  // async createOrderCommandHandler(
  //   @Payload() data: CreateOrderEvent,
  //   @Ctx() context: NatsJetStreamContext
  // ): Promise<any> {
  //   const subject = context.message.subject;
  //   console.log(`MS - Received command ${subject} on Orders Microservice`);
  //   console.log('MS - ....with payload', data);
  //   const result = await this.appService.createOrder()

  //   // Here you create Order and insert CreatedOrderEvent to the event database
  //   // as a single transaction. The publish flag will be false false

  //   // here you return the CreatedOrderEvent.
  //   return "order XYZ created";
  // }

  //************************************************************** */
  // Order event listeners
  //************************************************************** */
  // Listens for event published on Nats
  // IMPORTANT: Listeners that are updating downstream data stores should be 
  // version their entities to ensure CUD events are processed in order
  // SEE UDEMY LESSON 42 and refer to link below on Typeorm optimistic concurrency control
  // https://github.com/typeorm/typeorm/issues/3608
  // @EventPattern('order.created')
  // @ListenForEvent(Subjects.OrderCreated)
  // public async orderCreatedHandler(
  //   @Ctx() context: NatsJetStreamContext,
  //   @Payload() data: OrderCreatedEvent,
  // ) {
  //   console.log(`MS - OrderCreatedEvent Listener received event subject: ${context.message.subject} data: ${data}`);
  //   /* process message */
  //   /* mark outbox entry as completed  */
  //   context.message.ack();  /* acknowledge message */
  //   console.log(`MS - OrderCreatedEvent Listener processed and acknowledged event: ${context.message.subject} data: ${data}`);
  // }

  // Subscribes to order.updated
  // @EventPattern('order.updated')
  // @ListenForEvent(Subjects.OrderUpdated)
  // public async orderUpdatedHandler(
  //   @Ctx()      context: NatsJetStreamContext,
  //   @Payload()  data: OrderUpdatedEvent,
  // ) {
  //   context.message.ack();
  //   console.log('received: ' + context.message.subject, data);
  // }

  // Subscribes to order.created 
  // @EventPattern('order.created')
  // @ListenForEvent(Subjects.OrderCreated)
  // public async orderCreatedHandler(
  //   @Ctx() context: NatsJetStreamContext,
  //   @Payload() data: OrderCreatedEvent,
  // ) {
  //   /* process message */
  //   /* mark outbox entry as completed  */
  //   context.message.ack();  /* acknowledge message */
  //   console.log('received: ' + context.message.subject, data);
  // }

  // Subscribes to order.deleted
  // @ListenForEvent(Subjects.OrderDeleted)
  // public async orderDeletedHandler(
  //   @Ctx() context: NatsJetStreamContext,
  //   @Payload() data: OrderDeletedEvent,
  // ) {
  //   context.message.ack();
  //   console.log('received: ' + context.message.subject, data);
  // }
  


}