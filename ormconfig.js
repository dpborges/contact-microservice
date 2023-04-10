const SnakeNamingStrategy = require('typeorm-naming-strategies').SnakeNamingStrategy;
// const { createConnection } = require('net');
const path = require('path');

console.log("Ormconfig Loaded from Project Folder")

// Base config options
const dbConfig = {
  logging: false,
  synchronize: false,
  migrations: ['migrations/*.ts'],
  cli: {
    migrationsDir: 'migrations',
  },
  namingStrategy: new SnakeNamingStrategy(),
};


// Config options for each environment. The environment is predicated on NODE_ENV environment variable
switch (process.env.NODE_ENV) {
  case 'development':
    Object.assign(dbConfig, {
      host: 'localhost',
      type: 'postgres',
      port:  5432,
      database: 'contact_dev',
      username: 'postgres',
      password: 'admin',
      synchronize: true,
      logging: false,
      entities: ['**/*.entity.js'], // in dev mode nest transpiles our ts files to js first; hence we look for entities ending in js
      // entities: [path.join(__dirname, 'src', '**', '*.entity.{ts,js}')],
      // entities: [path.join(__dirname, 'src', '**', '*.entity.js')],
      // entities: ['dist/**/*.entity.{ts,js}'],
      sessionCache: 'true',
      keepConnectionAlive: true,    //supposedly solves the default connnection already exist issue
    });
    break;
  case 'test':
    Object.assign(dbConfig, {
      host: 'localhost',
      type: 'postgres',
      port:  5432,
      database: 'contact_test',
      username: 'postgres',
      password: 'admin',
      logging: 'true',
      // entities: ['**/*.entity.{ts,js}'],  // works for start:test environment
      // entities: ['**/*.entity.ts'],  // in test mode ts-jest looks for entities as ts files
      entities: [path.join(__dirname, 'src', '**', '*.entity.{ts,js}')], // works for e2e test
      migrationsRun: true,    // runs a migration before each of our  tests
      dropSchema: false,       // if set to true, it will delete your data after run tests
      synchronize: false
    });
  break;
  case 'production':
    Object.assign(dbConfig, {
      type: 'postgres',
      url: process.env.DATABASE_URL,
      migrationsRun: false,     // enable as needed; runs a migration to propagate db change to production
      entities: ['**/*.entity.js'],
      ssl: {
        rejectUnauthorized: false, // This is Heroku specific
      }
    });
  default:
    throw new Error('unknown environment')
}

module.exports = {
  dbConfig,
  namingStrategy: new SnakeNamingStrategy()
}