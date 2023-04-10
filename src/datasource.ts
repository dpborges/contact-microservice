import { DataSource, QueryRunner } from "typeorm";

// *********************************************************
// This is used by my typeorm scripts in package.json
// *********************************************************
// import { User } from './users/entities/user.entity';
const { dbConfig } = require('../ormconfig');

console.log("========= DB CONFIG START ==============")
console.log(dbConfig)
console.log("========= DB CONFIG END   ==============")

let appDataSource: DataSource =  new DataSource(dbConfig);

appDataSource.initialize()
  .then(() => {
      console.log("Data Source has been initialized!")
  })
  .catch((err) => {
      console.error("ERROR: during Data Source initialization", err)
  })

export default appDataSource;
