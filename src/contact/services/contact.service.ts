import { Repository, DataSource } from 'typeorm';
import { RepoToken } from '../../db-providers/repo.token.enum';
// import { UpdateContactResponse } from '../responses/update.contact.response';
import { ConfigModule } from '@nestjs/config';
import { OutboxService } from '../../outbox/outbox.service';
import { CreateContactResponse } from '../responses/create.contact.response';
// import { ContactSaveService } from './../contact.save.service';
import { Contact } from '../entities/contact.entity';
import { Injectable, Inject } from '@nestjs/common';
// import { ContactAggregate } from '../types/contact.aggregate';
import { ContactAggregateService } from './contact.aggregate.service';
import { ContactAggregate } from '../types/contact.aggregate';
import { CreateContactEvent } from '../../events/contact/commands';
import { CreateEntityResponse } from '../../common/responses/command.response-Delete';
import { ContactCreatedEvent } from '../../events/contact/domainChanges';
import { CustomNatsClient } from 'src/custom.nats.client.service';
import { ContactOutbox } from '../../outbox/entities/contact.outbox.entity';
import { DomainChangeEventFactory } from './domain.change.event.factory';
import { DomainChangeEventManager } from '../../outbox/domainchange.event.manager';
import { ConfigService }  from '@nestjs/config';
import { genBeforeAndAfterImage } from '../../utils/gen.beforeAfter.image';
import { DataChanges } from '../../common/responses/base.response';
import { UpdateContactEvent, DeleteContactEvent } from '../../events/contact/commands';
import { logStart, logStop } from 'src/utils/trace.log';
import { BaseError, ClientError } from '../../common/errors';
import { ServerError, ServerErrorReasons, ClientErrorReasons } from '../../common/errors';
import { BaseResponse } from '../../common/responses/base.response';
import { CreateContactSaga, DeleteContactSaga, UpdateContactSaga } from '../sagas';
import { ContactQueryService } from '../dbqueries/services';
import { DeleteTransactionResult } from '../transactions/types/delete.transaction.result';
const logTrace = true;

/**
 * Contact Service is the primary interface to the contact microservice controller. Each 
 * controller command to Create, Delete, or Update Contact makes a call to contact service.
 * The contact service calls the underlying query service, sagas, or helper services to 
 * fulfill the request.
 * It does preliminary existence checks before calling the underlying services and/or sagas.
 * This layer returns response (eg. hypermedia) to microservice controller, which in turn
 * returns the response to the api-gateway. Standard Response objects are  returned by sagas.
 * If not, a standard response is constructed by this service before responding to api-gateway.
 */
@Injectable()
export class ContactService {
  
  private generatedEvents: Array<ContactCreatedEvent> = [];

  constructor(
    private createContactSaga: CreateContactSaga,
    private updateContactSaga: UpdateContactSaga,
    private deleteContactSaga: DeleteContactSaga,
    private contactAggregateService: ContactAggregateService,
    private customNatsClient: CustomNatsClient,
    private configService: ConfigService,
    private outboxService: OutboxService,
    private domainChangeEventFactory: DomainChangeEventFactory,
    private domainChangeEventManager: DomainChangeEventManager, 
    private contactQueryService: ContactQueryService,
  ) { }
  
  /**
   * Create aggregate using create.contact.saga which returns value as hypermedia response.
   * @param createContactEvent 
   * @returns createContactResponse | ServerError
   */ 
  async createContact(createContactEvent: CreateContactEvent):  Promise<CreateContactResponse | BaseError> {
    const methodName = 'createContact';
    logTrace && logStart([methodName, 'createContactEvent',createContactEvent ], arguments);

    const { header, message } = createContactEvent;

    /* Check if contact exists, if so, return 409 conflict(duplicate) error  */
    const { accountId } = header;
    const { email } = message;
    const contactExists = await this.contactQueryService.checkContactExistsByEmail(accountId, email);
    if (contactExists) {
      return this.duplicateContactError(email);
    }

    /* Run the create contact saga */
    let sagaResult: CreateContactResponse | BaseError;
    sagaResult = await this.createContactSaga.execute(createContactEvent);

    logTrace && logStop(methodName, 'sagaResult', sagaResult);
    return sagaResult;
  }

  /**
   * Update contact aggregate using UpdateContactSaga. Since before and after images
   * need to be generated , the response object is constructed by the update contact saga.
   * @param updateContactEvent 
   */
  async updateContact(updateContactEvent: UpdateContactEvent): Promise<any> {
    // const methodName = 'updateContact';
    // logTrace && logStart([methodName, 'updateContactEvent',updateContactEvent ], arguments);

    const { header, message } = updateContactEvent; 
    const { id, accountId, ...updateProperties }  = message; 

    /* If contact does not exists, return 404 error */
    const contactExists = await this.contactQueryService.checkContactExistsById(accountId, id);
    if (!contactExists) {
      return this.notFoundContactError(id)
    }

    /* Execute update contact saga */
    const result: any = await this.updateContactSaga.execute(updateContactEvent)

    // logTrace && logStop(methodName, 'createContactResponse', createContactResponse);
    return result;
  }

  /**
   * Delete contact aggregate using DeleteContactSaga. The response in this case 
   * is the 
   * @param updateContactEvent 
   */
   async deleteContact(deleteContactEvent: DeleteContactEvent): Promise<any | BaseError> {
    const methodName = 'deleteContact';
    logTrace && logStart([methodName, 'deleteContactEvent',deleteContactEvent ], arguments);

    const { header, message } = deleteContactEvent; 
    const { id, accountId, ...updateProperties }  = message; 

    /* If contact does not exists, return 404 error */
    const contactExists = await this.contactQueryService.checkContactExistsById(accountId, id);
    if (!contactExists) {
      return this.notFoundContactError(id)
    }

    /* Execute update contact saga */
    const result: DeleteTransactionResult = await this.deleteContactSaga.execute(deleteContactEvent);

    logTrace && logStop(methodName, 'result', result);
    return result;
  }
  

  // *****************************************************************
  // Helper methods
  // *****************************************************************

  createAggregateError(email) {
    let createError = new ServerError(500);
    createError.setMessage(ServerErrorReasons.databaseError);
    createError.setReason(`failed to create contact with email:${email} `);
    return createError;
  }

  duplicateContactError(email) {
    const duplicateError = new ClientError(409); /* this sets generic message */
    duplicateError.setReason(ClientErrorReasons.DuplicateEntry);
    duplicateError.setLongMessage(`contact with email '${email}' already exists`);
    return duplicateError;
  }

  notFoundContactError(id) {
    const duplicateError = new ClientError(404); /* this sets generic message */
    // duplicateError.setReason(ClientErrorReasons.KeysNotInDatabase);
    duplicateError.setLongMessage(`contact id: ${id}`);
    return duplicateError;
  }
}