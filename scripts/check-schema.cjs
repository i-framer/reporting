const mysql = require('mysql2/promise');

async function getSchema() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: Number(process.env.MYSQL_PORT) || 3306
  });

  // Get all tables
  const [tables] = await connection.execute('SHOW TABLES');
  console.log('=== TABLES ===');
  for (const row of tables) {
    const tableName = Object.values(row)[0];
    console.log('-', tableName);
  }

  // Get columns for each table
  for (const row of tables) {
    const tableName = Object.values(row)[0];
    const [columns] = await connection.execute('DESCRIBE ' + tableName);
    console.log('\n=== ' + tableName.toUpperCase() + ' ===');
    for (const col of columns) {
      console.log('  ' + col.Field + ' (' + col.Type + ')');
    }
  }

  await connection.end();
}

getSchema().catch(e => console.error('Error:', e.message));
