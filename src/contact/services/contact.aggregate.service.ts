import { DataChanges } from '../../common/responses/base.response';
var camelize = require('camelize');
import { contactRepositories } from '../repos/contact.repositories';
import { ContactAcctRel } from '../entities/contact.acct.rel.entity';
import { ContactSource } from '../entities/contact.source.entity';
// import { ContactSaveService } from '../contact.save.service';
import { Injectable, Inject } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { Contact } from '../entities/contact.entity';
// import { AggregateRoot } from 'src/aggregrate/aggregateRoot';
// import { CreateContactDto } from '../dtos/create.contact.dto';
import { RepoToken } from '../../db-providers/repo.token.enum';
// import { ContactAggregateEntities } from '../aggregate-types/contact.aggregate.type';
import { ContactAggregate } from '../types/contact.aggregate'
import { BusinessRule } from '../business-rules/business-rule.enum';
// import { TransactionStatus } from './transaction-status.type-DELETE-ts'
import { CreateContactEvent } from 'src/contact/events/commands';
import { ContactCreatedEvent } from 'src/contact/events/domainChanges';
import { contactAcctSourceSql } from '../dbqueries';
import { contactAcctSql } from '../dbqueries';
import { getContactByAcctAndId } from '../dbqueries';
import { CreateContactTransaction } from '../transactions';
import { genBeforeAndAfterImage } from '../../utils/gen.beforeAfter.image';
import { DeleteTransactionResult } from '../transactions/types/delete.transaction.result';
import { DeleteContactTransaction } from '../transactions';
import { QueryOptions } from '../types';
import { logStart, logStop } from '../../utils/trace.log';

const logTrace = true;
const logTraceOff = false;

// Class used to construct aggregate object and related entities from event payload.
// This class centralizes aggregate business rules in this one class. The aggregate 
// version is maintained in the aggregate root level (contact relation). The external
// services reference Aggregate by aggregate root id only. All Creates ,Updates, and
// Deletes are managed by the AggregateService (this service).
/**
 * 
 */
@Injectable()
export class ContactAggregateService  {

  // private events: Array<ContactCreatedEvent> = [];
  // private numberOfAggregateEntities = 3;  // used for applying updates

  constructor(
    private createContactTransaction: CreateContactTransaction,
    private deleteContactTransaction: DeleteContactTransaction,
    @Inject(RepoToken.CONTACT_REPOSITORY) private contactRepository: Repository<Contact>,
    @Inject(RepoToken.CONTACT_SOURCE_REPOSITORY) private contactSourceRepository: Repository<ContactSource>,
    @Inject(RepoToken.CONTACT_ACCT_REL_REPOSITORY) private contactAcctRelRepository: Repository<ContactAcctRel>,
    @Inject(RepoToken.DATA_SOURCE) private dataSource: DataSource
  ) {};

  // Define mandatory entities only below and omit optional entities as they will 
  // be added dynamically upon update.
  // aggregate: ContactAggregateEntities = {
  //    contact: null,
  //    contactAcctRel: null
  // }
 
  /* Constructs aggregate from parts from the create <domain> event object. If properties for
     optional relations are not provided, do not add to aggregateEntities object.  */
  async createAggregate(createContactEvent: CreateContactEvent): Promise<ContactAggregate> {
    /* destructure event to extract aggregate entities */
    const { accountId } = createContactEvent.header;
    const { email, firstName, lastName, mobilePhone } = createContactEvent.message;
    const { sourceType, sourceName } = createContactEvent.message;
    
    /* declare aggregate */
    let aggregate: ContactAggregate = { contact: null, contactAcctRel: null, contactSource: null };

    /* create contact instance and set the aggregate property */
    aggregate.contact = this.contactRepository.create({
       email, firstName, lastName,  mobilePhone
    });
    
    /* create instance of contact account relation; defer assigining actual contactId till save contact  */
    const placeholderContactId: number = -1;
    aggregate.contactAcctRel = this.contactAcctRelRepository.create({
      accountId, contactId:  placeholderContactId
    });

    /* create Optional contactSource relation and add to aggregateEntities only if properties exist  */
    if (sourceName && sourceType) {
      aggregate.contactSource = this.contactSourceRepository.create({ sourceType, sourceName });
    }

    /* initialize verion to 1 */
    // this.aggregate.contact.version = 1;  

    /* Return aggregate entities instance so it can subsequently be used by save() operation */
    return aggregate;
  };


  /**
   * Saves the aggregate to the database using the createContactTransaction
   * @param contactAggregate 
   * @returns 
   */
  async saveAggregate(contactAggregate: ContactAggregate): Promise<ContactAggregate>   {
    const savedAggregate = await this.createContactTransaction.create(contactAggregate);
    return savedAggregate;
  }
     
  /**
   * Delete Aggregate 
   * @param contactAggregate 
   * @returns DeleteTransactionResult
   */
  async deleteAggregate(contactAggregate: ContactAggregate): Promise<DeleteTransactionResult>   {
    const savedAggregate = await this.deleteContactTransaction.delete(contactAggregate);
    return savedAggregate;
  }

  /**
   * Fetches aggregate entities by accountId, email
   * @param accountId 
   * @param email 
   * @returns contactAggregateEntities
   */
  async getAggregateEntitiesBy(accountId: number, id: number): Promise<ContactAggregate> {
    const methodName = 'getAggregateEntitiesBy';
    logTrace && logStart([methodName, 'accountId', 'id'], arguments)
    // Initialize mandatory entities only below. Optional entities will be added dynamically
    let contactAggregateEntities: ContactAggregate = {
      contact: null,
      contactAcctRel: null
    };
    
    // get query that joins the 3 tables
    let sqlStatement = getContactByAcctAndId(accountId, id); /* defaults to joining 3 tables */

    // Execute query
    const contactArray = await this.dataSource.query(sqlStatement);
    
    // If no results, return the initialized contactAggregateEntities object 'as-is'
    if (contactArray.length < 1) {
      return contactAggregateEntities
    }
    let [ contactData ] = contactArray; /* destructure array */
    contactData = camelize(contactData) /* convert to camel case */
    
    /* pull out major aggregate key(s) */
    const { contactId } = contactData;  

    /* pull out properties for each entity  */
    const { version, firstName, lastName, email, mobilePhone } = contactData; /* contact data */
    const { sourceId, sourceType, sourceName } = contactData;                 /* source data */
    const { acctRelId } = contactData;                                        /* acctRel data */
    
    // Construct the individual entities in the aggregate
    /* contact */
    const contact = { id: contactId, version, email, firstName, lastName, mobilePhone }
    /* contact_acct_rel */
    const contactAcctRel = { id: acctRelId, accountId, contactId }
    /* optional contact_source; add only if exists */
    const contactSource  = { id: sourceId, contactId,  sourceType, sourceName };

    // Assign entities to AggregateEntities; omit optional entities that are null
    contactAggregateEntities.contact = this.contactRepository.create(contact);
    contactAggregateEntities.contactAcctRel = this.contactAcctRelRepository.create(contactAcctRel);
    if (sourceId) {  /* optional contact_source; add only if exists */
      contactAggregateEntities.contactSource = this.contactSourceRepository.create(contactSource);
    }

    /* returns only aggregate entities that exist; if not, the entity is omitted*/
    logTrace && logStop(methodName, "contactAggregateEntities", contactAggregateEntities);
    return contactAggregateEntities
  }
  
  /**
   * Fetches and returns an object with the entities that make up the aggregate.
   * Since an update request returns the hypermdia response uri as contact/id, this method 
   * will be required retrieve the contact by id, unless  the hypermedia returns
   * accountId and email in uri instead.. to be determined.
   * @param id 
   * @returns contactAggregateEntities
   */
  async getAggregateEntitiesById(id: number): Promise<ContactAggregate> {
    const methodName = 'getAggregateEntitiesById';
    logTrace && logStart([methodName, 'id'], arguments)

    // Initialize mandatory entities only below. Optional entities will be added dynamically
    let contactAggregateEntities: ContactAggregate = {
      contact: null,
      contactAcctRel: null
    };
    
    // Define where clause using database syntax (not camelcase)
    let whereClause = `WHERE contact.id = ${id}`;
    let queryOptions: QueryOptions = { whereClause }
    
    // select query based on whether optional entity exist or not
    let sqlStatement = contactAcctSourceSql(queryOptions); /* defaults to joining 3 tables */
    const contactSourceExists = await this.contactSourceExists(id)
    if (!contactSourceExists) {
      sqlStatement = contactAcctSql(whereClause);         /* joins contact & acct tbl only */
    }
    // Execute query
    const contactArray = await this.dataSource.query(sqlStatement);
    
    console.log("SQL RESULT: ", JSON.stringify(contactArray) )
    // If no results, return the initialized contactAggregateEntities object 'as-is'
    if (contactArray.length < 1) {
      return contactAggregateEntities
    }
    let [ contactData ] = contactArray; /* destructure array */
    contactData = camelize(contactData) /* convert to camel case */
    console.log("Contact Data ", JSON.stringify(contactData));
    console.log("LETTER C")

    // Extract contact data.
    /* pull out major aggregate keys */
    const { accountId, contactId } = contactData;  
    /* pull entity data */
    const { version, email, firstName, lastName, mobilePhone } = contactData; /*contact data */
    const { sourceId, sourceType, sourceName } = contactData;                 /* source data */
    const { acctRelId } = contactData;                                        /* acctRel data */
    if (!sourceId) { console.log("NO SOURCE ID")}
    // Construct Entity objects.                                  
    /* contact */
    const contact = { id: contactId, version, email, firstName, lastName, mobilePhone }
    /* contact_acct_rel */
    const contactAcctRel = { id: acctRelId, accountId, contactId }
    /* optional contact_source; add only if exists */
    const contactSource  = { id: sourceId, contactId,  sourceType, sourceName };
    // Construct aggregate
    contactAggregateEntities.contact = this.contactRepository.create(contact);
    contactAggregateEntities.contactAcctRel = this.contactAcctRelRepository.create(contactAcctRel);
    if (sourceId) {  /* optional contact_source; add only if exists */
      contactAggregateEntities.contactSource = this.contactSourceRepository.create(contactSource);
    }
    
    logTrace && logStop(methodName, "contactAggregateEntities", contactAggregateEntities);
    /* returns only aggregate entities that exist; if not, the entity is omitted*/
    return contactAggregateEntities
  }

  // TBD
  loadAggregateRoot() {}
  // TBD
  loadPartialAggregate() {}
 
  /* Layers on idempotent busines rules on top of aggregate returned from ContactAggregate.create method */
  // async idempotentCreate(
  //   contactAggregateEntities: ContactAggregateEntities,
  // ): Promise<ContactAggregateEntities> {
  //   const methodName = 'idempotentCreate';
  //   logTrace && logStart([methodName, 'contactAggregateEntities','aggregateId'], arguments);

  //   /* pull out individual entities from aggregate */
  //   const { contact, contactAcctRel, contactSource } = contactAggregateEntities;
    
  //   /* run contactExistInAcct Check business rule */
  //   const ruleInputs = { accountId: contactAcctRel.accountId, email: contact.email };
  //   const ruleResult: any = await this.runAsyncBusinessRule(BusinessRule.contactExistInAcctCheck, ruleInputs);
  //   const { contactExists, registeredInAcct, contactInstance } = ruleResult;
    
  //   /* if contact already exists add the id from existing contactInstance */
  //   if (contactExists) {  /* If exists, no need to call save; Just return existing aggregate root */
  //     contactAggregateEntities.contact.id = contactInstance.id;
  //     logTrace && logStop(methodName, 'contactAggregateEntities', contactAggregateEntities);
  //     return contactAggregateEntities; 
  //   } 

  //   if (!registeredInAcct)  {
  //     console.log(`WARNING: contact id:${contact.id} not registered in contactAcctRel table`)
  //   }
    
  //   /* if contact already exists but is not registered in provided account, 
  //      add the contactAcctRel to the aggregate, and remove the other entities except aggreate root*/
  //   // if (contactExists && !registeredInAcct) {  /* If contact exists but registered in account, register in contactAcctRel table */
  //   //   contactAggregateEntities.contact.id = contactInstance.id;
  //   //   contactAggregateEntities.contactAcctRel = this.contactAcctRelRepository.create({
  //   //     accountId: contactAcctRel.accountId, contactId: contactInstance.id
  //   //   })
  //   //   /* add the contact Id to contact entity to force a save vs create */
  //   //   contact.id = contactInstance.id;
  //   //   contactAggregateEntities.contact = contact;
  //   //   contactAggregateEntities.contactSource = null; /* setting to null, to avoid saving again on save */
  //   // }
  //   // console.log("    generated Event ", JSON.stringify(generatedEvents))

  //   contactAggregateEntities = await this.contactSaveService.save(contactAggregateEntities);

  //   /* returns the aggregate root */
  //   logTrace && logStop(methodName, 'contactAggregateEntities', contactAggregateEntities);
  //   return contactAggregateEntities;
  // }
 
 async runAsyncBusinessRule(businessRule, ruleInputs) {
    let ruleResult: any = true;
    switch(businessRule) {
      case BusinessRule.contactExistInAcctCheck:
        ruleResult = await this.findContactByAcctandEmail(ruleInputs)
        break;
      case BusinessRule.updateContactXyzRule:
        /* bizlogic */
        break;
      default:
    }
    return ruleResult;
  }

  // /* generate CreateDomainEvent;  NOTE: create events are scoped to the aggregate root 
  //    If changes to related tables are needed downstream, the client must fetch the entire aggregate. */
  // generateCreateDomainEvent(contactCreatedEvent: ContactCreatedEvent): Array<ContactCreatedEvent> {
  //   return this.events.concat(contactCreatedEvent);
  // }
  

  applyUpdates(updateRequest, aggregateEntities: ContactAggregate): ContactAggregate {
    let updatedEntities: ContactAggregate;
    updatedEntities = this.applyUpdatesToAggregateEntities(updateRequest, aggregateEntities)
    return updatedEntities;
  }

  generateBeforeAndAfterImages(updateRequest, aggregateEntities: ContactAggregate): DataChanges {
    const beforeAndAfterImages = genBeforeAndAfterImage(updateRequest, aggregateEntities)
    return beforeAndAfterImages;
  }

  
  /**
   * This method iterates thru the aggregate entities that have been defined and applies the
   * updates passed in the updateObject. For entities that are not mandatory (eg contactSource), 
   * they may not appear in the aggregateEntities object. Therefore, we need to handle those
   * cases in a separate method called applyUpdatesToOptionalEntities.
   * @param updateObject 
   * @param aggregateEntities 
   * @returns aggregateEntities - after updates applied
   */
  applyUpdatesToAggregateEntities(updateObject: any, aggregateEntities): ContactAggregate {
    const methodName = 'applyUpdatesToAggregateEntities';
    logTrace && logStart([methodName, 'updateObject', 'aggregateEntities'], arguments);

    let entityKeys = Object.keys(aggregateEntities);
    console.log("Entity keys ", entityKeys);

    // Iterate aggregate entities and apply any updates to them from the updateObject 
    entityKeys.forEach((key) => {
      aggregateEntities[key] = this.applyUpdatesToObject(updateObject, aggregateEntities[key])
    })

    // Handle Optional Entities Here
    // Define list of optional entities
    const optionalEntityNames  = ['contactSource'];   /* list of optional entity names */
    // Define list of default objects for each of the entities
    const defaultEntityObjects = [{ sourceType: 'na', sourceName: 'na' }] /* list of associated optional entity objects */    
    // Apply updates to the optional entities, if properties are provided in the updateObject
    aggregateEntities = this.applyUpdatesToOptionalEntities(
      optionalEntityNames, defaultEntityObjects, updateObject, aggregateEntities
    )
    
   logTrace && logStop(methodName, 'aggregateEntities', aggregateEntities)
   return aggregateEntities;
  };

  
  /**
   * Method is used to handle an optional entities. This allows client to submit an update
   * to an entity that is not in the aggregateEntities object. It will use the defaultEntityObject
   * to apply the updates then adds the object to the aggregateEntities object.
   * This parent function calls the singleton function applyUpdatesToOptionalEntity().
   * @param optionalEntityNames 
   * @param defaultEntityObjects 
   * @param updateObject 
   * @param aggregateEntities 
   * @returns 
   */
  applyUpdatesToOptionalEntities(optionalEntityNames, defaultEntityObjects, updateObject, aggregateEntities) {
    for (const i in optionalEntityNames) {
      aggregateEntities =  this.applyUpdatesToOptionalEntity(
        optionalEntityNames[i], 
        defaultEntityObjects[i],
        updateObject,
        aggregateEntities
      )
    }
    return aggregateEntities;
  }

  /**
   * Check for updates that may have been submitted to update an optional (non-mandatory) entity.
   * If so, it applies updates to default entity object and then adds entity to aggregateEntities object.
   */
  applyUpdatesToOptionalEntity(entityName, defaultEntityObject, updateObject, aggregateEntities) {
    console.log(">>> INSIDE applyUpdatesToOptionalEntity")
    console.log("    entityName:", entityName)
    console.log("    defaultEntityObject:", defaultEntityObject)
    console.log("    updateObject:", updateObject)
    console.log("    aggregateEntities:", aggregateEntities)
    // Check if entity name is in aggregateEntities object
    const entityNameExist = this.nameExistInObject(entityName, aggregateEntities);
    console.log("    entityNameExist:", entityNameExist)

    // extract entity properties from default object provided.
    const entityProperties = Object.keys(defaultEntityObject);
    console.log("    entityProperties:", entityProperties)

    // if entity not in aggregateEntities, use defaultEntityObject to apply updates
    if (!entityNameExist) {
      console.log("    entityNameExist: FALSE")
      /* checks if updateObject has properties to apply to the default entity properties provided  */
      let updateObjectProperties = Object.keys(updateObject)
      let propsToUpdate = entityProperties.filter((prop) => updateObjectProperties.includes(prop));
      /* apply updateObject properties to object, if updates exist */
      if (propsToUpdate.length > 0) {
        console.log("    propsToUpdate: EXIST")
        aggregateEntities[entityName] = this.applyUpdatesToObject(updateObject, defaultEntityObject);
        console.log("    aggregateEntities: ", aggregateEntities)
      }
    }

    return aggregateEntities;
  }

  validate() {};


  //***************************************************************************** 
  // Business Rules
  //***************************************************************************** 
  /* business rule for contact exists check */
  async findContactByAcctandEmail(ruleInputs): Promise<any> {
    console.log(">>>> Inside findContactByAcctandEmail")
    const { accountId, email } = ruleInputs;
    let  ruleResult = { contactInstance: null, contactExists: false, registeredInAcct: false }
    /* check if account exists in contact table */
    const contact =  await this.contactRepository.findOne({
      where: { email }
    });
    /* if contact does exist, return result */
    if (!contact) {
      return ruleResult;
    }
    /* check if contact is registered in account by checking contact_acct_rel */
    const contactAcctRel =  await this.contactAcctRelRepository.findOne({
      where: { accountId, contactId:  contact.id}
    });
    /* provide outcomes in rule result */
    ruleResult = {
      contactInstance: contact ? contact : null,
      contactExists:   contact ? true : false,
      registeredInAcct: contactAcctRel ? true : false
    }
    console.log(` RULE RESULT: ${JSON.stringify(ruleResult)}`)
    return ruleResult;
  }


  //***************************************************************************** 
  // Helper Methods
  //***************************************************************************** 
  /**
   * Applies properties within an updateObject to a targetObject.
   * This method can be called multiple times for each individual entity in the 
   * AggregateEntities object.
   * @param updatesObject 
   * @param targetObject 
   * @returns updateObject
   */
  applyUpdatesToObject(updatesObject, targetObject) {
    const methodName = 'applyUpdatesToObject';
    logTraceOff && logStart([methodName,'updatesObject', 'targetObject'], arguments);

    /* Define function that returns array of common properties between the 2 objects */
    function getCommonPropertiesBetween(object1, object2) {
      // get update keys
      let object1Keys = Object.keys(object1);
      // get target object keys
      let object2Keys = Object.keys(object2);
      // extract common keys between both objects
      let commonKeys = object1Keys.filter(value => object2Keys.includes(value));
      return commonKeys;
    }

    /* Define function applies updates in updateObject to targetObject */
    function applyUpdatesToTargetObject(keysArray, updateObject, targetObject) {
      let targetWithUpdates = { ...targetObject };
      keysArray.forEach((key) => targetWithUpdates[key] = updateObject[key]);
      return targetWithUpdates;
    }

    // checks if anything to update in object to update
    let commonProps = getCommonPropertiesBetween(updatesObject, targetObject);

    // if no overlapping(common) properties just return original target object, otherwise 
    // return updated object
    let updatedObject = null;
    if (commonProps.length > 0) {
        updatedObject = applyUpdatesToTargetObject(commonProps, updatesObject, targetObject)
    } else {
      return targetObject
    }

    logStop(methodName,'updatedObject', updatedObject);
    return updatedObject;
  }

  /**
   * Checks if Name exists in object
   */
  nameExistInObject(name: string, objectToCheck): boolean {
    const entityKeys = Object.keys(objectToCheck); /* get keys */
    const nameExists = entityKeys.includes(name);  /* see if name is in key array */
    return nameExists;
  }

  async contactSourceExists(id) {
    return await this.contactSourceRepository.findOne({ where: { id } });
  }


}

  