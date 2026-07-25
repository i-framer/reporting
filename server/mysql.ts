import mysql from 'mysql2/promise';

// Translate raw MySQL/network errors into clear, user-friendly messages.
export function friendlyMysqlError(err: any): string {
  const code = err?.code as string | undefined;
  switch (code) {
    case 'ECONNREFUSED':
      return "Can't reach the database right now. The database server is online but is refusing connections (the MySQL service may be stopped or not accepting remote connections). Please try again shortly, or contact your database administrator if the problem continues.";
    case 'ETIMEDOUT':
    case 'PROTOCOL_SEQUENCE_TIMEOUT':
      return "The database took too long to respond. It may be temporarily unavailable or overloaded. Please try again in a moment.";
    case 'ENOTFOUND':
    case 'EAI_AGAIN':
      return "Can't find the database server. The database address may be incorrect or temporarily unreachable. Please contact your database administrator.";
    case 'ER_ACCESS_DENIED_ERROR':
      return "The database rejected the login details. The username or password may be incorrect.";
    case 'ER_BAD_DB_ERROR':
      return "The requested database doesn't exist on the server. Please check the database name.";
    case 'ECONNRESET':
      return "The database connection was interrupted. Please try again in a moment.";
  }
  if (typeof err?.message === 'string' && /timeout/i.test(err.message)) {
    return "The query took too long and was cancelled. Try narrowing it down or applying more specific filters.";
  }
  return err?.message || "Something went wrong while contacting the database. Please try again.";
}

export async function executeMySQL(config: any, sql: string, timeoutMs: number = 60000) {
  // Config should contain: host, user, password, database, port
  // We'll create a connection (not a pool for now, to keep it stateless per request for this MVP)
  // In production, you'd want to maintain pools per data source.
  
  const connection = await mysql.createConnection({
    host: config.host,
    user: config.user,
    password: config.password,
    database: config.database,
    port: Number(config.port) || 3306,
    connectTimeout: 10000 // 10s connection timeout
  });

  try {
    // Set query timeout via MySQL session variable
    await connection.execute(`SET SESSION MAX_EXECUTION_TIME = ${timeoutMs}`);
    
    // Execute with timeout wrapper
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Query timeout after ${timeoutMs}ms`)), timeoutMs + 5000);
    });
    
    const queryPromise = connection.execute(sql);
    const [rows, fields] = await Promise.race([queryPromise, timeoutPromise]) as any;
    
    // Extract column names
    const columns = fields.map((f: any) => f.name);
    
    return {
      columns,
      rows: Array.isArray(rows) ? rows : [rows] // Handle non-select results
    };
  } finally {
    await connection.end();
  }
}

export async function executeMySQLWithParams(config: any, sql: string, params: any[]) {
  const connection = await mysql.createConnection({
    host: config.host,
    user: config.user,
    password: config.password,
    database: config.database,
    port: Number(config.port) || 3306,
    connectTimeout: 5000
  });

  try {
    const [rows, fields] = await connection.execute(sql, params);
    const columns = fields ? (fields as any[]).map((f: any) => f.name) : [];
    return {
      columns,
      rows: Array.isArray(rows) ? rows : [rows]
    };
  } finally {
    await connection.end();
  }
}

export async function testMySQLConnection(config: any) {
  const connection = await mysql.createConnection({
    host: config.host,
    user: config.user,
    password: config.password,
    database: config.database,
    port: Number(config.port) || 3306,
    connectTimeout: 5000
  });
  
  try {
    await connection.ping();
    return true;
  } finally {
    await connection.end();
  }
}
