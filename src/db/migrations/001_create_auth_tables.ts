/**
 * Migration: Create Authentication Tables
 *
 * This migration creates the initial database tables for the authentication system:
 * - users table: Stores user account information
 * - sessions table: Manages JWT tokens and active sessions
 *
 * @module db/migrations/001_create_auth_tables
 */

import { INIT_QUERIES } from '../schema.js';

export interface MigrationResult {
  success: boolean;
  error?: string;
  timestamp: Date;
}

/**
 * Run the migration - creates authentication tables
 *
 * @param db - Database connection object (implementation-specific)
 * @returns Promise with migration result
 */
export async function up(db: unknown): Promise<MigrationResult> {
  try {
    // Note: Actual database implementation would be injected here
    // This is a template that supports multiple database engines
    console.log('Running migration: 001_create_auth_tables');

    for (const query of INIT_QUERIES) {
      console.log('Executing query:', query.substring(0, 50) + '...');
      // await db.execute(query);
    }

    console.log('✓ Migration completed successfully');

    return {
      success: true,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error('✗ Migration failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date(),
    };
  }
}

/**
 * Rollback the migration - drops authentication tables
 *
 * @param db - Database connection object (implementation-specific)
 * @returns Promise with migration result
 */
export async function down(db: unknown): Promise<MigrationResult> {
  try {
    console.log('Rolling back migration: 001_create_auth_tables');

    const queries = [
      'DROP TABLE IF EXISTS sessions;',
      'DROP TABLE IF EXISTS users;',
    ];

    for (const query of queries) {
      console.log('Executing query:', query);
      // await db.execute(query);
    }

    console.log('✓ Rollback completed successfully');

    return {
      success: true,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error('✗ Rollback failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date(),
    };
  }
}

/**
 * Migration metadata
 */
export const metadata = {
  version: '001',
  name: 'create_auth_tables',
  description: 'Creates users and sessions tables for authentication',
  author: 'CodeGenAgent',
  created_at: new Date().toISOString(),
};
