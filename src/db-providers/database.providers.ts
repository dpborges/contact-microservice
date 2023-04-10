import { DataSource } from 'typeorm';
const { dbConfig } = require('../../ormconfig');

// import { Contact } from '../contact/entities/contact.entity';

/**
 * This registers the DATA_SOURCE token in the DI container, which maps to the datasource
 * defined in ormconfig.
 * The ormconfig.js file will return the dbConfig object for the respective 
 * environment (test,prod,development) based your NODE_ENV setting 
 */
export const databaseProviders = [
  {
    provide: 'DATA_SOURCE',
    useFactory: async () => {    /* returns a datasource factory function */
      const dataSource = new DataSource(dbConfig);
      return dataSource.initialize();
    },
  },
];