import { Repository, DataSource } from 'typeorm';
import { RepoToken } from '../../db-providers/repo.token.enum';
import { ContactOutbox } from '../../outbox/entities/contact.outbox.entity';
import { CreateContactEvent } from '../events/commands';
import { OutboxService } from '../../outbox/outbox.service';
import { CreateContactTransaction } from './../transactions';
import { ContactAggregate } from '../types'
import { DomainChangeEventFactory } from '../services/domain.change.event.factory';
import { ConfigService } from '@nestjs/config';
import { Injectable, Inject } from '@nestjs/common';
import { ContactAggregateService } from '../services/contact.aggregate.service';
import { DomainChangeEventManager } from '../../outbox/domainchange.event.manager';
import { createContactProcess } from './create.contact.saga.process';
import { getContactByAcctAndEmail } from '../dbqueries';
import { 
  isStepsSuccessful, getSagaResult, 
  updateProcessStatus, setRollbackTrigger 
} from './helpers';
import { ContactQueryService } from '../services/contact.query.service';
import { logStart, logStop } from '../../utils/trace.log';
import { StepResult } from './types/step.result';
import { CreateContactResponse } from '../responses';
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
export class CreateContactSaga {

  constructor(
    private contactAggregateService: ContactAggregateService,
    private createContactTransaction: CreateContactTransaction,
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
    createContactEvent: CreateContactEvent
    ): Promise<any> {

    // Initialize process object and step result object
    let createProcess = { ...createContactProcess }; /* clone process definition*/
    let result: StepResult = { data: null, processStatus: null }

    // INITIATE SAGA PROCESS
    // =============================================================================
    // STEP 1: CREATE AGGREGATE from the CreateContactEvent payload; 
    result = await this.createAggregate(createProcess, createContactEvent); /* returns the aggregate */
    const contactAggregate = result.data;
    createProcess = result.processStatus;

    // =============================================================================
    // STEP 2: SAVE AGGREGATE
    result = await this.saveAggregate(createProcess, contactAggregate);
    const savedAggregate = result.data;
    createProcess = result.processStatus;

    // =============================================================================
    // STEP 3: GENERATE CREATED EVENT; if domainChange events 
    let serializedCreatedEvent = null; 
    if (this.domainChangeEventsNotEnabled()) { /* bypass step by updating successflag to true */
      createProcess = updateProcessStatus(createProcess, 'step3', true)    
    } else {
      result = await this.generateCreatedEvent(createProcess, createContactEvent, savedAggregate);
      serializedCreatedEvent = result.data 
      createProcess = result.processStatus
    }

    // =============================================================================
    // STEP 4: CREATE OUTBOX INSTANCE: If domainChange events are disabled, 
    let outboxInstance = null;
    if (this.domainChangeEventsNotEnabled()) { /* bypass step by updating successflag to true */
      createProcess = updateProcessStatus(createProcess, 'step4', true)    
    } else {
      result = await this.createOutboxInstance(createProcess, createContactEvent, serializedCreatedEvent);
      outboxInstance = result.data; 
      createProcess = result.processStatus;
    }

    // =============================================================================
    // STEP 5: SAVE OUTBOX
    let savedOutboxInstance = null;
    let previousStepsSuccessful = isStepsSuccessful([
      'step1', 'step2', 'step3', 'step4'
    ], createProcess);
    if (this.domainChangeEventsNotEnabled()) { /* bypass step by updating successflag to true */
      createProcess = updateProcessStatus(createProcess, 'step5', true)    
    } else { 
      /* if previous steps were successful, set rollback trigger */
      if (!previousStepsSuccessful) {  
        createProcess = setRollbackTrigger(createProcess)
      } else {  /* otherwise update outbox  */
        result = await this.saveOutbox(createProcess, outboxInstance);
        savedOutboxInstance = result.data; 
        createProcess = result.processStatus;
      }
    }
    /* if this step was not successful or rollback was triggered, do rollback */
    if (!createProcess['step5'].success || createProcess['rollbackTriggered']) {
      const rollbackMethods = [this.rollbackSaveAggregate]; /* rollback methods in reverse order*/
      await this.rollbackSaga(rollbackMethods)
    }
  
    // =============================================================================
    // STEP 6: TRIGGER OUTBOX 
    let publishingCmdResult = null;
    /* bypass step by updating successflag to true */
    if (this.domainChangeEventsNotEnabled()) { 
      createProcess = updateProcessStatus(createProcess, 'step6', true)    
    } 
    /* trigger outbox ony if domain change events enabled and save aggregate(step2) was successful */
    if (this.domainChangeEventsEnabled() && createProcess['step2'].success) {
      result = await this.triggerOutbox(createProcess, savedAggregate.contact.accountId);
      publishingCmdResult = result.data; 
      createProcess = result.processStatus;
    } 
    
    // =============================================================================
    // FINALIZE STEP: if saga successful,  return deleted data object in the 
    // response otherwise, return error response and the log error 
    createProcess = getSagaResult(createProcess, 'create_contact_saga');
    let sagaResponse: any;
    if (createProcess['sagaSuccessful']) {
      sagaResponse = new CreateContactResponse(savedAggregate.contact.id)
    } else {
      let errorMsg = createProcess['sagaFailureReason'];
      sagaResponse = this.contactSagaError(errorMsg, '')
      this.logErrorIfExists(createProcess);
    }

    // =============================================================================
    // RETRUN SAGA RESPONSE to contact service, which will convert to hypermedia response
    return sagaResponse;
  }

  //****************************************************************************** */
  // Individual Saga Steps
  //****************************************************************************** */
  
  /**
   * Create Aggregate
   * @param processStatus 
   * @param createContactEvent 
   * @returns result
   */
  async createAggregate(processStatus, createContactEvent: CreateContactEvent): Promise<StepResult> {
    const methodName = 'createAggregate';
    logTrace && logStart([methodName, 'processStatus', 'createContactEvent'], arguments)

    /* Intialize result object */
    let result: StepResult = { data: null, processStatus: null };

    /* Business logic: Create Aggregate  */
    const contactAggregate = await this.contactAggregateService.createAggregate(createContactEvent);

    /* Update process success based on result */
    processStatus = updateProcessStatus(processStatus, 'step1', true)

    /* return Result */
    result = { data: contactAggregate, processStatus };
    logTrace && logStop(methodName, 'result', result)
    return result;
  }

  /**
   * Save Aggregate 
   * @param processStatus 
   * @param aggregate 
   * @returns result
   */
  async saveAggregate(processStatus, aggregate: ContactAggregate): Promise<StepResult> {
    const methodName = 'saveAggregate';
    logTrace && logStart([methodName, 'processStatus', 'aggregate'], arguments);

    /* Intialize result object */
     let result: StepResult = { data: null, processStatus: null };

    /* Business Logic: save aggregate */
    const savedAggregate = await this.contactAggregateService.saveAggregate(aggregate);

    /* Update process as successful */
    if (savedAggregate.contact.id) {   /* checks if id has been appended after update as success check  */
      processStatus = updateProcessStatus(processStatus, 'step2', true)
    }

    /* return Result */
    result = { data: savedAggregate, processStatus }
    logTrace && logStop(methodName, 'result', result)
    return result;
  }

  /**
   * Generate Created event
   * @param processStatus 
   * @param createContactEvent 
   * @param savedAggregate 
   * @returns result
   */
  generateCreatedEvent(processStatus, createContactEvent: CreateContactEvent, savedAggregate: ContactAggregate): StepResult {
    const methodName = 'generateCreatedEvent'
    logTrace && logStart([methodName, 'processStatus', 'createContactEvent', 'savedAggregate'], arguments)

    /* Business Logic: create serialized contactCreatedEvent */
    const serializedCreatedEvent = this.domainChangeEventFactory.genCreatedEventFor(
      createContactEvent, savedAggregate
    );
    /* Update process as successful */
    processStatus = updateProcessStatus(processStatus, 'step3', true)

    /* Return Result */
    let result = { data: serializedCreatedEvent, processStatus };
    logTrace && logStop(methodName, 'result', result)
    return result;
  }

  /**
   * Create Outbox Instance
   * @param processStatus 
   * @param createContactEvent 
   * @param serializedContactCreatedEvent 
   * @returns result
   */
  async createOutboxInstance(
    processStatus: any,
    createContactEvent: CreateContactEvent,
    serializedContactCreatedEvent: string): Promise<StepResult> 
  {
    const methodName = 'createOutboxInstance';
    logTrace && logStart([methodName, 'processStatus', 'createContactEvent','serializedContactCreatedEvent'], arguments);

    /* Get prior step status */
    let previousStepsSuccessful = isStepsSuccessful(['step1', 'step2', 'step3'], processStatus);

    /* Business Logic: create Outbox Instance of contactCreatedEvent, from createContactEvent */
    let contactOutboxInstance = null;
    if (previousStepsSuccessful) { 
      contactOutboxInstance = await this.outboxService.createContactCreatedInstance(
        createContactEvent, 
        serializedContactCreatedEvent
      );
    }

    /* update process status */
    if (previousStepsSuccessful && contactOutboxInstance) {
      processStatus = updateProcessStatus(processStatus, 'step4', true)
    }

    /* return result */
    let result = { data: contactOutboxInstance, processStatus }
    logTrace && logStop(methodName, 'result', result);
    return result;
  }
  
  /**
   * Save Outbox: this is know as a pivot point (see definition on top of file).
   * @param processStatus 
   * @param contactOutboxInstance 
   * @returns 
   */
  async saveOutbox(processStatus, contactOutboxInstance): Promise<StepResult> {
    const methodName = 'saveOutbox';
    logTrace && logStart([methodName, 'processStatus','contactOutboxInstance'], arguments);

    /* Intialize result object */
    let result: StepResult = { data: null, processStatus: null };
    let savedOutboxInstance: ContactOutbox = null;

    /* Business Logic: If no prior failures, save outbox */
    let previousStepsSuccessful = isStepsSuccessful(['step1', 'step2', 'step3', 'step4'], processStatus);
    if (previousStepsSuccessful) {
      savedOutboxInstance = await this.outboxService.saveOutboxInstance(contactOutboxInstance)
      if (savedOutboxInstance) { /* if outbox saved, set update result data and processStatus  */
        result.data = savedOutboxInstance;
        processStatus = updateProcessStatus(processStatus, 'step5', true);
        result.processStatus = processStatus;
      } 
    } 
    /* If save outbox returned null(failed) or any previous steps failed, do a rollback */
    if (!previousStepsSuccessful || !savedOutboxInstance) {      
      const rollbackMethods = [this.rollbackSaveAggregate];
      await this.rollbackSaga(rollbackMethods)
      processStatus = setRollbackTrigger(processStatus)
    }
    
    /* return result */
    result = { data: savedOutboxInstance, processStatus }
    logTrace && logStop(methodName, 'result', result);
    return result;
  }

  async triggerOutbox(processStatus, accountId) {
    const methodName = 'triggerOutbox';
    logTrace && logStart([methodName, 'processStatus','accountId'], arguments);
    /* Intialize result object */
    let result: StepResult = { data: null, processStatus: null };

    /* Business Logic: Sends command to outbox to publish unpublished events in outbox for a given account */
    const cmdResult: any = await this.domainChangeEventManager.triggerOutboxForAccount(accountId);

    /* Update process as successful */
    processStatus = updateProcessStatus(processStatus, 'step6', true)

    /* return result */
    result = { data: cmdResult, processStatus }
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
    
    console.log('OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO')
    console.log("ROLLBACK SAGA")
    console.log('OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO')
      

    /* process rollbacks in reverse  */
    // rollbackMethods.forEach(async (method)=> {
    //   /* execute rollback */
    //   // await method()
    // })
    // let rollBackResult = await 
    // call finalize
  }
  
  // Rollback Save Aggregate 
  async rollbackSaveAggregate() {
    // ROLLING BACK SHOULD CONSIST OF LOADING(FETCHING) AGGREGATE
    // AND DELETING EACH OF THE RELATIONS IN A SINGLE TRANSACTION
    console.log('OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO')
    console.log("ROLLBACK SAVE AGGREGATE")
    console.log('OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO')
  }

  // Save outbox compensation method
  async rollbackSaveOutbox() {

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
    const sagaResult = getSagaResult(processStatus);
    const { sagaSuccessful, sagaFailureReason } = sagaResult;
    if (!sagaSuccessful) {
      console.log("ERROR ",JSON.stringify(sagaResult,null,2))
    }
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
  