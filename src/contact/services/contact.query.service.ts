var camelize = require('camelize');
import { snakeCase } from 'snake-case';
import { databaseProviders } from '../../db-providers/database.providers';
import { Injectable, Inject } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { getContactCountByAcctAndEmail } from '../dbqueries/getContactCountByAcctAndEmail';
import { getContactCountByAcctAndId } from '../dbqueries/getContactCountByAcctAndId';
import { contactAcctSourceSql } from '../dbqueries';
import { RepoToken } from '../../db-providers/repo.token.enum'
import { PaginationQuery, QueryOptions } from '../types';
import { logStart, logStop, logStartVal } from '../../utils/trace.log';

const logTrace = true;

@Injectable()
export class ContactQueryService {

  constructor(
    // private contactSaveService: ContactSaveService,
    @Inject(RepoToken.DATA_SOURCE) private dataSource: DataSource
    // @Inject(RepoToken.CONTACT_REPOSITORY) private contactRepository: Repository<Contact>,
  ) {}

  /**
   * Check if contact exists by searching on email, where accountId is a given
   * @param accountId 
   * @param email 
   * @returns boolean
   */
  async checkContactExistsByEmail(accountId: number, email: string): Promise<boolean> {
    const methodName = 'checkContactExistsByEmail';
    logTrace && logStart([methodName, 'accountId', 'email'], arguments)

    // get query that joins the 3 tables
    let sqlStatement = getContactCountByAcctAndEmail(accountId, email); /* defaults to joining 3 tables */
    logTrace && console.log("SQL STATEMENT ", sqlStatement)
    // execute query
    const resultArray = await this.dataSource.query(sqlStatement);
    // destruction count from first array object
    const { count } = resultArray[0];

    let contactExists: boolean = false;
    if (count >  0) { contactExists = true };
    logTrace && logStop(methodName, 'contactExists', contactExists);
    return contactExists;
  }

   /**
   * Check if contact exists by searching on id, where accountId is a given
   * @param accountId 
   * @param id 
   * @returns boolean
   */
   async checkContactExistsById(accountId: number, id: number): Promise<boolean> {
    const methodName = 'checkContactExistsById';
    logTrace && logStart([methodName, 'accountId', 'id'], arguments)

    // get query that joins the 3 tables
    let sqlStatement = getContactCountByAcctAndId(accountId, id); /* defaults to joining 3 tables */
    logTrace && console.log("SQL STATEMENT ", sqlStatement)
    // execute query
    const resultArray = await this.dataSource.query(sqlStatement);
    const { count } = resultArray[0];
    
    let contactExists: boolean = false;
    if (count >  0) { contactExists = true };
    logTrace && logStop(methodName, 'contactExists', contactExists);
    return contactExists
  }

   /**
   * This function returns all contacts in the account by default. You can use Query options to 
   * provide a where clause, an order by, and/or set pagination values (LIMIT, OFFSET) shown
   * in the REST API as LIMIT, START.
   * @param queryOptions
   * @returns array
   */
   async findAllContacts(queryOptions?: QueryOptions): Promise<any> {
    const methodName = 'findAllContacts';
    logTrace && logStart([methodName, 'queryOptions'], arguments)


    // convert the filterBy to a where clause and add it to the queryOptions object
    if (queryOptions) {
      if (queryOptions.filterBy) {
        const whereClause =  this.convertToWhereClause(queryOptions.filterBy);
        queryOptions.whereClause = whereClause;
      }
    }

    // get query that joins the 3 tables
    let sqlStatement = contactAcctSourceSql(queryOptions); /* defaults to joining 3 tables */
    logTrace && console.log("SQL STATEMENT ", sqlStatement)
    // execute query
    const resultArray = await this.dataSource.query(sqlStatement);
    console.log("RESULTANT ARRAY ", resultArray)

    // transform raw result to camelcase and removes unwanted properties
    let transformedResult = this.transformItemsToContactAggregate(resultArray)
    
    logTrace && logStop(methodName, 'transformedResult', transformedResult);
    return transformedResult
  }

  // **********************************************************************
  // Helper methods
  // **********************************************************************

  transformItemsToContactAggregate(inputArray) {
    let transformedResult = inputArray.map((record) => {
      const camelizedResult =  camelize(record) /* converts to camel case */
      /* delete unwanted props from output */       
      delete camelizedResult.acctRelId;         
      delete camelizedResult.sourceId;
      return camelizedResult;
    })
    return transformedResult;
  }

  /* converts string passed in as queryOptions.filterBy to a string representing where clause */ 
  convertToWhereClause(filterBy) {
    console.log("INPUT TO CONVERT TO WHERE CLAUSE ", filterBy)
    const arrayOfNvPairs = filterBy.split(',');
    console.log("BEFORE SNAKE CASE CALL ", arrayOfNvPairs)
    const arrayOfNvPairsInSnakeCase = this.convertNamesToSnakeCase(arrayOfNvPairs);
    const arrayWithAndConditions = this.insertStringBetweenArrayElements(arrayOfNvPairsInSnakeCase, 'and')
    const filterByWithAnd = arrayWithAndConditions.join(' ');
    const whereClause = `WHERE ${filterByWithAnd}`;
    console.log("CONVERTED TO WHERE CLAUSE ", whereClause)
    return whereClause;
  }

  convertNamesToSnakeCase(arrayOfNvPairs) {
    const convertedNvPairs = arrayOfNvPairs.map((nvPair) => {
      const nvPairSplit = nvPair.split('=')
      let [ name, value ] = nvPairSplit;
      name = snakeCase(name);
      return name + '=' + value 
    })
    console.log("SNAKECASE IS ", convertedNvPairs)
    return convertedNvPairs;
  }

  insertStringBetweenArrayElements(inputArray, insertionString): Array<any> {
    let outPutArray = [];
    let maxAndInserts = inputArray.length - 1;
    for (let i = 0; i < inputArray.length; i++) {
      outPutArray.push(inputArray[i])
      if (i < maxAndInserts) { outPutArray.push(insertionString)}
    }
    console.log("WITH AND CONDITIONS ", outPutArray)
    return outPutArray;
  }
}