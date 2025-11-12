/**
 * Authentication Type Definitions
 *
 * This module exports TypeScript type definitions for the authentication system,
 * providing strict type safety across the application.
 *
 * @module types/auth
 */

/**
 * User account interface
 * Represents a user in the system
 */
export interface User {
  /** Unique user identifier (UUID v4) */
  id: string;

  /** User's email address (unique, indexed) */
  email: string;

  /** Hashed password (bcrypt) */
  password_hash: string;

  /** Account creation timestamp */
  created_at: Date;

  /** Last update timestamp */
  updated_at: Date;
}

/**
 * User creation input (without auto-generated fields)
 */
export interface CreateUserInput {
  email: string;
  password: string; // Plain text password (will be hashed)
}

/**
 * User update input (partial updates allowed)
 */
export interface UpdateUserInput {
  email?: string;
  password?: string; // Plain text password (will be hashed)
}

/**
 * User public data (safe to send to client)
 * Excludes sensitive information like password_hash
 */
export interface UserPublic {
  id: string;
  email: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Session interface
 * Represents an active user session with JWT token
 */
export interface Session {
  /** Unique session identifier (UUID v4) */
  id: string;

  /** User ID this session belongs to */
  user_id: string;

  /** JWT token string */
  token: string;

  /** Session expiration timestamp */
  expires_at: Date;

  /** Session creation timestamp */
  created_at: Date;

  /** Optional: Client IP address */
  ip_address?: string;

  /** Optional: Client user agent string */
  user_agent?: string;
}

/**
 * Session creation input
 */
export interface CreateSessionInput {
  user_id: string;
  token: string;
  expires_at: Date;
  ip_address?: string;
  user_agent?: string;
}

/**
 * JWT payload interface
 */
export interface JWTPayload {
  /** User ID */
  sub: string;

  /** User email */
  email: string;

  /** Issued at timestamp */
  iat: number;

  /** Expiration timestamp */
  exp: number;
}

/**
 * Authentication result
 */
export interface AuthResult {
  success: boolean;
  user?: UserPublic;
  token?: string;
  error?: string;
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Registration input
 */
export interface RegistrationInput {
  email: string;
  password: string;
}

/**
 * Type guard: Check if object is a valid User
 */
export function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    typeof obj.id === 'string' &&
    'email' in obj &&
    typeof obj.email === 'string' &&
    'password_hash' in obj &&
    typeof obj.password_hash === 'string' &&
    'created_at' in obj &&
    obj.created_at instanceof Date &&
    'updated_at' in obj &&
    obj.updated_at instanceof Date
  );
}

/**
 * Type guard: Check if object is a valid Session
 */
export function isSession(obj: unknown): obj is Session {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    typeof obj.id === 'string' &&
    'user_id' in obj &&
    typeof obj.user_id === 'string' &&
    'token' in obj &&
    typeof obj.token === 'string' &&
    'expires_at' in obj &&
    obj.expires_at instanceof Date &&
    'created_at' in obj &&
    obj.created_at instanceof Date
  );
}

/**
 * Type guard: Check if object is a valid JWTPayload
 */
export function isJWTPayload(obj: unknown): obj is JWTPayload {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'sub' in obj &&
    typeof obj.sub === 'string' &&
    'email' in obj &&
    typeof obj.email === 'string' &&
    'iat' in obj &&
    typeof obj.iat === 'number' &&
    'exp' in obj &&
    typeof obj.exp === 'number'
  );
}
