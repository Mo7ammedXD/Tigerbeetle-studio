#!/usr/bin/env node



const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');


const userDataPath = path.join(
  os.homedir(),
  'Library',
  'Application Support',
  'tigerbeetle-studio'
);
const dbPath = path.join(userDataPath, 'tigerbeetle-studio.db');


try {
  const db = new Database(dbPath);



  const accountColumns = db.pragma('table_info(accounts)');
  const accountColumnNames = accountColumns.map(col => col.name);


  const accountMigrations = [
    { name: 'user_data_128', sql: 'ALTER TABLE accounts ADD COLUMN user_data_128 TEXT' },
    { name: 'user_data_64', sql: 'ALTER TABLE accounts ADD COLUMN user_data_64 TEXT' },
    { name: 'user_data_32', sql: 'ALTER TABLE accounts ADD COLUMN user_data_32 INTEGER' },
  ];

  for (const migration of accountMigrations) {
    if (!accountColumnNames.includes(migration.name)) {
      db.exec(migration.sql);
    }
  }


  const transferColumns = db.pragma('table_info(transfers)');
  const transferColumnNames = transferColumns.map(col => col.name);




  const transferMigrations = [
    { name: 'user_data_128', sql: 'ALTER TABLE transfers ADD COLUMN user_data_128 TEXT' },
    { name: 'user_data_64', sql: 'ALTER TABLE transfers ADD COLUMN user_data_64 TEXT' },
    { name: 'user_data_32', sql: 'ALTER TABLE transfers ADD COLUMN user_data_32 INTEGER' },
  ];

  for (const migration of transferMigrations) {
    if (!transferColumnNames.includes(migration.name)) {
      db.exec(migration.sql);
    }
  }

  db.close();

} catch (error) {

  process.exit(1);
}
