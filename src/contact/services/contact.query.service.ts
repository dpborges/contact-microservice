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
   * This function uses a parameterized sql statement to get all contacts. Typical parameters 
   * when getting All Contacts are the 'where' clause to limit query to just the account records,
   * and the pagination query (eg.  { LIMIT, OFFSET }), for pagination purposes
   * @param queryOptions
   * @returns array
   */
   async getAllContacts(queryOptions: QueryOptions): Promise<any> {
    const methodName = 'checkContactExistsById';
    logTrace && logStart([methodName, 'accountId', 'id'], arguments)

    // get query that joins the 3 tables
    let sqlStatement = contactAcctSourceSql(queryOptions); /* defaults to joining 3 tables */
    logTrace && console.log("SQL STATEMENT ", sqlStatement)
    // execute query
    const resultArray = await this.dataSource.query(sqlStatement);
    const { count } = resultArray[0];

    
    logTrace && logStop(methodName, 'resultArray', resultArray);
    return resultArray
  }


}