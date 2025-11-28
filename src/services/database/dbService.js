/**
 * Database Service - Abstraction layer for database operations
 * This service allows easy swapping of database providers (Turso, PostgreSQL, etc.)
 */

import { createClient } from '@libsql/client';

// Database client instance (singleton)
let dbClient = null;

/**
 * Initialize database client
 * @returns {Object} Database client instance
 */
export function getDbClient() {
  if (!dbClient) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url || !authToken) {
      console.error('Database configuration missing. Check environment variables.');
      throw new Error('Database configuration missing');
    }

    dbClient = createClient({
      url,
      authToken,
    });
  }

  return dbClient;
}

/**
 * Execute a SELECT query
 * @param {string} sql - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise<Array>} Query results
 */
export async function query(sql, params = []) {
  try {
    const client = getDbClient();
    const result = await client.execute({
      sql,
      args: params,
    });
    return result.rows || [];
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * Execute an INSERT, UPDATE, or DELETE query
 * @param {string} sql - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Execution result
 */
export async function execute(sql, params = []) {
  try {
    const client = getDbClient();
    const result = await client.execute({
      sql,
      args: params,
    });
    return {
      rowsAffected: result.rowsAffected || 0,
      lastInsertRowid: result.lastInsertRowid,
    };
  } catch (error) {
    console.error('Database execute error:', error);
    throw error;
  }
}

/**
 * Execute multiple queries in a transaction
 * @param {Array<{sql: string, params: Array}>} queries - Array of queries
 * @returns {Promise<Array>} Results of all queries
 */
export async function transaction(queries) {
  try {
    const client = getDbClient();
    const results = [];

    // Note: Turso doesn't support traditional transactions yet,
    // so we execute queries sequentially
    for (const { sql, params = [] } of queries) {
      const result = await client.execute({
        sql,
        args: params,
      });
      results.push(result);
    }

    return results;
  } catch (error) {
    console.error('Database transaction error:', error);
    throw error;
  }
}

/**
 * Get a single row from query
 * @param {string} sql - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise<Object|null>} Single row or null
 */
export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Check if database is connected
 * @returns {Promise<boolean>} Connection status
 */
export async function checkConnection() {
  try {
    await query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
}

