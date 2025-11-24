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

console.log('🔧 Migrating database at:', dbPath);

try {
  const db = new Database(dbPath);

  console.log('📋 Checking current schema...');


  const accountColumns = db.pragma('table_info(accounts)');
  const accountColumnNames = accountColumns.map(col => col.name);

  console.log('Current accounts columns:', accountColumnNames);


  const accountMigrations = [
    { name: 'user_data_128', sql: 'ALTER TABLE accounts ADD COLUMN user_data_128 TEXT' },
    { name: 'user_data_64', sql: 'ALTER TABLE accounts ADD COLUMN user_data_64 TEXT' },
    { name: 'user_data_32', sql: 'ALTER TABLE accounts ADD COLUMN user_data_32 INTEGER' },
  ];

  for (const migration of accountMigrations) {
    if (!accountColumnNames.includes(migration.name)) {
      console.log(`➕ Adding column: accounts.${migration.name}`);
      db.exec(migration.sql);
    } else {
      console.log(`✅ Column exists: accounts.${migration.name}`);
    }
  }


  const transferColumns = db.pragma('table_info(transfers)');
  const transferColumnNames = transferColumns.map(col => col.name);

  console.log('Current transfers columns:', transferColumnNames);


  const transferMigrations = [
    { name: 'user_data_128', sql: 'ALTER TABLE transfers ADD COLUMN user_data_128 TEXT' },
    { name: 'user_data_64', sql: 'ALTER TABLE transfers ADD COLUMN user_data_64 TEXT' },
    { name: 'user_data_32', sql: 'ALTER TABLE transfers ADD COLUMN user_data_32 INTEGER' },
  ];

  for (const migration of transferMigrations) {
    if (!transferColumnNames.includes(migration.name)) {
      console.log(`➕ Adding column: transfers.${migration.name}`);
      db.exec(migration.sql);
    } else {
      console.log(`✅ Column exists: transfers.${migration.name}`);
    }
  }

  db.close();
  console.log('✅ Migration completed successfully!');
  console.log('');
  console.log('You can now restart the application.');

} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}
