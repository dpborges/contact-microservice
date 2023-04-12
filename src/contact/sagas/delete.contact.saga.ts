import { ContactSource } from './../entities/contact.source.entity';
import { Repository, DataSource } from 'typeorm';
import { RepoToken } from '../../db-providers/repo.token.enum';
import { ContactOutbox } from '../../outbox/entities/contact.outbox.entity';
import { DeleteContactEvent } from '../events/commands';
import { OutboxService } from '../../outbox/outbox.service';
import { ContactAggregate } from '../types'
import { DomainChangeEventFactory } from '../services/domain.change.event.factory';
import { ConfigService } from '@nestjs/config';
import { Injectable, Inject } from '@nestjs/common';
import { ContactAggregateService } from '../services/contact.aggregate.service';
import { DomainChangeEventManager } from '../../outbox/domainchange.event.manager';
import { deleteContactProcess } from './delete.contact.saga.process';
import { 
  isStepsSuccessful, getSagaResult, 
  updateProcessStatus, setRollbackTrigger 
} from './helpers';
import { ContactQueryService } from '../services/contact.query.service';
import { logStart, logStop } from '../../utils/trace.log';
import { StepResult } from './types/step.result';
import { DeleteTransactionResult } from '../transactions/types/delete.transaction.result';
import { DeleteContactResponse } from '../responses';
import { ServerError } from '../../common/errors';

const logTrace = false;

// ************************************************************************************
// In the happy path, each step returns a result object that has a data property and 
// processStatus property set. The resultant data and updated process is passed to the 
// next step. This repeats itself for every step there after.
// If one of the steps finds that a previous step(s) failed, it may call for a rollback.
// This step is known as an pivot point. All subsequent steps after the inflection
// point must check if rollback was triggered. If so, each subsequent step must return 
// null data, set step success to false, and leave the rollbackTriggered flag set. 
// ************************************************************************************

@Injectable()
export class DeleteContactSaga {

  constructor(
    private contactAggregateService: ContactAggregateService,
    private domainChangeEventFactory: DomainChangeEventFactory,
    private domainChangeEventManager: DomainChangeEventManager,
    private outboxService: OutboxService,
    private configService: ConfigService,
    private contactQueryService: ContactQueryService,
    @Inject(RepoToken.DATA_SOURCE) private dataSource: DataSource
  ) {}
 
  //***************************************************************************** */
  // Saga Orchestration Steps
  //***************************************************************************** */
  async execute(
    // contactAggregate: ContactAggregate,
    deleteContactEvent: DeleteContactEvent
    ): Promise<any> {

    // Initialize process object and step result object
    let deleteProcess = { ...deleteContactProcess }; /* clone process definition*/
    let result: StepResult = { data: null, processStatus: null }

    // INITIATE SAGA PROCESS
    // =============================================================================
    // STEP 1: LOAD AGGREGATE from the UpdateContactEvent payload; 
    result = await this.loadAggregate(deleteProcess, deleteContactEvent); /* returns the aggregate */
    let contactAggregate = result.data;
    deleteProcess = result.processStatus;

    // =============================================================================
    // STEP 2: DELETE AGGREGATE
    let deleteTranResult: DeleteTransactionResult;
    if (deleteProcess['step1'].success) {
      result =  await this.deleteAggregate(deleteProcess, contactAggregate);
      deleteTranResult = result.data;
      deleteProcess = result.processStatus;
    }

    // =============================================================================
    // STEP 3: GENERATE CONTACT DELETED EVENT; Only if domainChangeEvents flag is true.
    // If false, update step in deleteProcess as successful, otherwise saga will fail.
    let serializedContactDeletedEvent = '';
    if (this.domainChangeEventsEnabled() && deleteProcess['step2'].success) { 
      result = this.generateContactDeletedEvent(deleteProcess, deleteContactEvent, contactAggregate);
      serializedContactDeletedEvent = result.data;
      deleteProcess = result.processStatus;
    } 
    /* signals to saga that it is ok to bypass this step */
    if (this.domainChangeEventsNotEnabled()) { 
      deleteProcess = updateProcessStatus(deleteProcess, 'step3', true)  
    }

    // =============================================================================
    // STEP 4: CREATE OUTBOX INSTANCE
    let outboxInstance = null;
    if (this.domainChangeEventsEnabled() && deleteProcess['step2'].success) { 
      result = this.createOutboxInstance(deleteProcess, deleteContactEvent, serializedContactDeletedEvent);
      outboxInstance = result.data;
      deleteProcess  = result.processStatus;
    }  
    /* signals to saga that it is ok to bypass this step */
    if (this.domainChangeEventsNotEnabled()) { 
      deleteProcess = updateProcessStatus(deleteProcess, 'step4', true)  
    }

    // =============================================================================
    // STEP 5: SAVE OUTBOX INSTANCE - this is a Pivot step
    let savedOutboxInstance = null;
    let previousStepsSuccessful = isStepsSuccessful([
      'step1', 'step2', 'step3', 'step4'
    ], deleteProcess);
    if (this.domainChangeEventsNotEnabled()) { 
      /* signals to saga that its ok to bypass step */
      deleteProcess = updateProcessStatus(deleteProcess, 'step5', true)    
    } else { 
      /* if previous steps not successful, set rollback trigger */
      if (!previousStepsSuccessful) {  
        deleteProcess = setRollbackTrigger(deleteProcess)
      } else {  /* otherwise update outbox  */
        result = await this.saveOutboxInstance(deleteProcess, outboxInstance);
        savedOutboxInstance = result.data;
        deleteProcess = result.processStatus;
      }
    }
    /* if this step was not successful or rollback was triggered, do rollback */
    if (!deleteProcess['step5'].success || deleteProcess['rollbackTriggered']) {
      const rollbackMethods = [this.rollbackDeleteAggregate]; /* rollback methods in reverse order*/
      await this.rollbackSaga(rollbackMethods)
    }
  
    // =============================================================================
    // STEP 6: TRIGGER OUTBOX - publish outbox events as long aggregate id was loaded
    // and accountid is available. 
    let publishingCmdResult: any = null; 
    let { contact } = contactAggregate;
    if (this.domainChangeEventsEnabled() && deleteProcess['step1'].success) { 
      if (contact.id) {
        result = await this.triggerOutbox(deleteProcess, contact.accountId);
        let publishingCmdResult = result.data; 
        deleteProcess = result.processStatus;
      }
    }
    if (this.domainChangeEventsNotEnabled()) {
      deleteProcess = updateProcessStatus(deleteProcess, 'step6', true)    
    }

    // =============================================================================
    // STEP 7: GENERATE DELETED DATA
    let deletedData: any = null;
    if (deleteProcess['step1'].success) { 
      result = await this.generateDeletedData(deleteProcess, contactAggregate);
      deletedData = result.data; 
      deleteProcess = result.processStatus;
    }

    // =============================================================================
    // FINALIZE STEP: if saga successful,  return deleted data object in the 
    // response otherwise, return error response and the log error 
    deleteProcess = getSagaResult(deleteProcess, 'delete_contact_saga');
    let sagaResponse: any;
    if (deleteProcess['sagaSuccessful']) {
      sagaResponse = new DeleteContactResponse(deletedData)
    } else {
      let errorMsg = deleteProcess['sagaFailureReason'];
      sagaResponse = this.contactSagaError(errorMsg, deleteContactEvent.message.id)
      this.logErrorIfExists(deleteProcess);
    }
    
    return sagaResponse;
  }

  //****************************************************************************** */
  // Individual Saga Steps
  //****************************************************************************** */
  
  /**
   * Load Aggregate
   * @param processStatus 
   * @param updateContactEvent 
   * @returns result
   */
  async loadAggregate(processStatus, deleteContactEvent: DeleteContactEvent): Promise<StepResult> {
    const methodName = 'loadAggregate'
    logTrace && logStart([methodName, 'processStatus', 'updateContactEvent'], arguments)
    /* Intialize result object */
    let result: StepResult = { data: null, processStatus: null };

    /* Business logic: Create Aggregate  */
    const { header, message } = deleteContactEvent;
    const { id }  = message; 
    const { accountId } = header;
    const aggregate: ContactAggregate = await this.contactAggregateService.getAggregateEntitiesBy(accountId, id);

    /* Update process success based on result */
    processStatus = updateProcessStatus(processStatus, 'step1', true)

    /* return Result */
    result = { data: aggregate, processStatus };
    logTrace && logStop(methodName, 'result', result)
    return result;
  }

  /**
   * Generate before and after images from pre-loaded contactAggregate (as before image)
   * and updateContact event (after image).
   * @param processStatus 
   * @param updateContactEvent 
   * @param contactAggregate 
   * @returns result 
   */
  // generateBeforeAndAfterImages(processStatus, updateContactEvent, contactAggregate) {
  //   const methodName = 'generateBeforeAndAfterImages'
  //   logTrace && logStart([methodName, 'updateRequest', 'aggregate'], arguments)

  //   /* Intialize result object */
  //   let result: StepResult = { data: null, processStatus: null };

  //   /* Construct updateRequest (properties in the update event) */
  //   const { header, message } = updateContactEvent;
  //   const { id, accountId, ...updateProperties }  = message; 
  //   let updateRequest = { ...updateProperties }; /* separates out update properties only*/

  //   /* Business logic:  */
  //   let beforeAfterImages = this.contactAggregateService.generateBeforeAndAfterImages(updateRequest, contactAggregate);

  //   /* Update process success based on result */
  //   processStatus = updateProcessStatus(processStatus, 'step2', true)

  //   /* return Result */
  //   result = { data: beforeAfterImages, processStatus };
  //   logTrace && logStop(methodName, 'result', result)
  //   return result;
  // };
  
    
  /**
   * Delete Aggregate 
   * @param processStatus 
   * @param aggregate 
   * @returns result
   */
  async deleteAggregate(processStatus, aggregate: ContactAggregate): Promise<StepResult> {
    const methodName = 'deleteAggregate'
    logTrace && logStart([methodName, 'processStatus', 'aggregate'], arguments)
    /* Intialize result object */
    let result: StepResult = { data: null, processStatus: null };

    /* Business Logic: save aggregate */
    const deleteResult = await this.contactAggregateService.deleteAggregate(aggregate);

    /* Update process success flag */
    // if (savedAggregate.contact.id) {   /* checks if id has been appended after update as success check  */
      processStatus = updateProcessStatus(processStatus, 'step2', true)
    // }

    /* return Result */
    result = { data: deleteResult, processStatus }
    logTrace && logStop(methodName, 'result', result)
    return result;
  }

  /**
   * Generates an domain change updated event. 
   * Note that the domainChangeEventsEnabled flag must be set to publish events.
   * @param deleteContactEvent 
   * @param aggregate 
   */
  generateContactDeletedEvent(
    processStatus,
    deleteContactEvent: DeleteContactEvent, 
    aggregate: ContactAggregate): StepResult 
  {
    const methodName = 'generateContactDeletedEvent';
    logTrace && logStart([methodName, 'deleteContactEvent','aggregate'], arguments);

    /* Intialize result object */
    let result: StepResult = { data: null, processStatus: null };

    /* Business Logic: create serialized contactCreatedEvent */
    const serializedContactDeletedEvent = this.domainChangeEventFactory.genDeletedEventFor(deleteContactEvent);

    /* Update process success flag */
    processStatus = updateProcessStatus(processStatus, 'step3', true)

    /* return Result */
    result = { data: serializedContactDeletedEvent, processStatus }
    logTrace && logStop(methodName, 'result', result)
    return result;
  }
   
  /**
   * Returns an outbox instance with the domain change event.
   * @param createContactEvent 
   * @param aggregate 
   */
  createOutboxInstance(
    processStatus,
    deleteContactEvent: DeleteContactEvent, 
    serializedContactDeletedEvent: string) 
  {
    const methodName = 'createOutboxInstance';
    logTrace && logStart([methodName, 'deleteContactEvent','serializedContactDeletedEvent'], arguments);

    /* Intialize result object */
    let result: StepResult = { data: null, processStatus: null };

    /* Business Logic: create Outbox Instance of contactCreatedEvent, from createContactEvent */
    let contactOutboxInstance: ContactOutbox = this.outboxService.generateContactDeletedInstance(
        deleteContactEvent, 
        serializedContactDeletedEvent
      );

    /* Update process success flag */
    processStatus = updateProcessStatus(processStatus, 'step4', true)
  
    /* return Result */
    result = { data: contactOutboxInstance, processStatus }
    logTrace && logStop(methodName, 'result', result)
    return result;
  }

  
  /**
   * Save Outbox: this is know as a pivot point (see definition on top of file).
   * @param processStatus 
   * @param contactOutboxInstance 
   * @returns 
   */
  async saveOutboxInstance(processStatus, contactOutboxInstance): Promise<StepResult> {
    const methodName = 'saveOutbox';
    logTrace && logStart([methodName, 'processStatus','contactOutboxInstance'], arguments);
    /* Intialize result object */
    let result: StepResult = { data: null, processStatus: null };
    let savedOutboxInstance: ContactOutbox = null;

    /* Business Logic: If no prior failures, save outbox */
    savedOutboxInstance = await this.outboxService.saveOutboxInstance(contactOutboxInstance)
    if (savedOutboxInstance) { /* if outbox saved, set update result data and processStatus  */
      result.data = savedOutboxInstance;
      processStatus = updateProcessStatus(processStatus, 'step5', true);
      result.processStatus = processStatus;
    } 
    
    /* return result */
    result = { data: savedOutboxInstance, processStatus }
    logTrace && logStop(methodName, 'result', result);
    return result;
  }

  /**
   * Triggers outbox to publish unpublished events
   * @param processStatus 
   * @param accountId 
   * @returns 
   */
  async triggerOutbox(processStatus, accountId) {
    const methodName = 'triggerOutbox';
    logTrace && logStart([methodName, 'processStatus','accountId'], arguments);
    /* Intialize result object */
    let result: StepResult = { data: null, processStatus: null };

    /* Business Logic: Sends command to outbox to publish unpublished events in outbox for a given account */
    const cmdResult: any = await this.domainChangeEventManager.triggerOutboxForAccount(accountId);

    /* update process status */
    processStatus = updateProcessStatus(processStatus, 'step6', true);

    /* return result */
    result = { data: cmdResult, processStatus }
    logTrace && logStop(methodName, 'result', result);
    return result;
  }

  /**
   * Generate Deleted Data to include as part of the response
   * @param processStatus 
   * @param contactAggregate
   * @returns 
   */
  async generateDeletedData(processStatus, contactAggregate) {
    const methodName = 'triggerOutbox';
    logTrace && logStart([methodName, 'processStatus','accountId'], arguments);
    /* Intialize result object */
    let result: StepResult = { data: null, processStatus: null };

    /* Business Logic: Sends command to outbox to publish unpublished events in outbox for a given account */
    /* destructure aggregate relations */
    const { contact, contactAcctRel, contactSource } = contactAggregate;

    /* extract properties from aggregate root and other relations  */
    let deletedData = { ... contact, accountId: contactAcctRel.accountId };
    if (contactSource) {
      const { sourceType, sourceName } = contactSource;
      deletedData = { ...deletedData, sourceType, sourceName };
    }

    /* update process status */
    processStatus = updateProcessStatus(processStatus, 'step7', true);

    /* return result */
    result = { data: deletedData, processStatus }
    logTrace && logStop(methodName, 'result', result);
    return result;
  }

  //*************************************************************** */
  // Rollback Steps
  //*************************************************************** */

  /**
   * Takes an array of rollback method references, in reverse order 
   * @param rollbackMethods 
   */
  async rollbackSaga(rollbackMethods) {
    // If any steps failed, rollback in reverse order
    

    /* process rollbacks in reverse  */
    // rollbackMethods.forEach(async (method)=> {
    //   /* execute rollback */
    //   // await method()
    // })
    // let rollBackResult = await 
    // call finalize
  }

  // Rollback Delete Aggregate 
   async rollbackDeleteAggregate() {
    // ROLLING BACK SHOULD CONSIST OF LOADING(FETCHING) AGGREGATE
    // AND DELETING EACH OF THE RELATIONS IN A SINGLE TRANSACTION
    console.log('OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO')
    console.log("ROLLBACK DELETE AGGREGATE")
    console.log('OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO')
  }

  // Save outbox compensation 
  async rollbackSaveOutbox() {
    /* update step status */
  }

  async setRollbackTrigger(processUpdate) {
    processUpdate = { ... processUpdate }
    /* update step status */
  }

  //*************************************************************** */
  // Helper Methods
  //*************************************************************** */
  /**
   * Returns config parm 'PUBLISH_DOMAIN_CHANGE_EVENTS' as boolean
   * @returns 
   */
  domainChangeEventsEnabled(): boolean {
    const domainChangeEventsEnabled = this.configService.get('PUBLISH_DOMAIN_CHANGE_EVENTS');
    if (domainChangeEventsEnabled === 'true' )  { return true;  } 
    if (domainChangeEventsEnabled === 'false' )  { return false; } 
  }
  domainChangeEventsNotEnabled(): boolean {
    return !this.domainChangeEventsEnabled()
  }
  
  /**
   * Used as last step of the Saga to log an error if it occurred
   * @param processStatus 
   */
  logErrorIfExists (processStatus) {
    const methodName = 'logErrorIfExists';
    let logTrace = true;
    logTrace && logStart([methodName, 'processStatus'], arguments)
    const sagaResult = getSagaResult(processStatus);
    const { sagaSuccessful, sagaFailureReason } = sagaResult;
    if (!sagaSuccessful) {
      console.log("ERROR ",JSON.stringify(sagaResult,null,2))
    }
    logTrace && logStop(methodName, 'sagaResult', sagaResult)
  }
  
  /**
   * Return Server error
   * @param processStatus 
   * @param id
   */
  contactSagaError(failureReason: string, id) {
    const sagaError = new ServerError(500); /* this sets generic message */
    sagaError.setReason(failureReason)
    return sagaError;
  }

}
  