// import { DataSource } from 'typeorm';
// import { apiAccessTokenMig } from 'migrations/ApiAccessTokenMig';
// import { ApiAccessToken } from '../auth/entities/api-access-token.entity';
// import { rm } from 'fs/promises'; // did not work with nodejs v12
import { createConnection } from 'typeorm';
const fs = require('fs');
import { join } from 'path';
import { QueryRunner } from 'typeorm' ;
import { Connection } from "typeorm";
// import { ApiAccessTokenMig }  from '../../db_builds/ApiAccessTokenMig';
// import { UserSessionMig } from '../../db_builds/UserSessionMig';
// import { UserMig } from '../../db_builds/UserMig';
// import { testDataSource } from './testDataSource';
import { User } from '../users/entities/user.entity';
const dbConfig = require('../../ormconfig');

// let apiAccessTokenMig: ApiAccessToken;
let queryRunner: QueryRunner;
let connection: Connection;

// Sets Up Test environment before either each or all tests.
// In our case, we delete test database before all e2e tests. How does our e2e test know to delete the 
// test database? If you look in the test folder, you'll see a file 'jest-e2e.json' file.
// The property "setupFilesAfterEnv" in this file,  tells jest to run the script referenced
// there before all e2e tests or before each e2e test, depending which functions you use below. 
global.beforeAll(async () => {
  // console.log(">>>> INSIDE Setup.ts global.beforeAll()");

  connection  = await createConnection(dbConfig);
  queryRunner = await connection.createQueryRunner(); 

  // await queryRunner.query('delete from migrations');

  async function truncate(tableName) {
    await queryRunner.query(`DELETE FROM ${tableName}`)
  }
  const tables = [
    "public.contact", 
  ];
  /* truncate tables */
  await tables.forEach(truncate);

  console.log("Following tables were truncated in Setup.ts global.beforeAll", tables)

  /* rebuild user table */
  // const userMig    = new UserMig();
  // await userMig.down(queryRunner);
  // await userMig.up(queryRunner);

  /* rebuild user_session table */
  // const userSessionMig    = new UserSessionMig();
  // await userSessionMig.down(queryRunner);
  // await userSessionMig.up(queryRunner);

  /* rebuild api_access_token_table */
  // const apiAccessTokenMig = new ApiAccessTokenMig();
  // await apiAccessTokenMig.down(queryRunner);
  // await apiAccessTokenMig.up(queryRunner);
});

// Close database connection (close file in case of sqlite), after each e2e test is completed
global.afterAll(async () => {
  // console.log(">>>> INSIDE Setup.ts  global.afterAll()");
  await queryRunner.release();
  // await appDataSource.destroy();
  await connection.close();
})

