/**
 * Authentication Service - Abstraction layer for authentication
 * This service allows easy swapping of auth providers (JWT, OAuth, etc.)
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_EXPIRY } from '@/constants/app';

const SALT_ROUNDS = 10;

/**
 * Hash a password
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
export async function hashPassword(password) {
  try {
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    return hashed;
  } catch (error) {
    console.error('Error hashing password:', error);
    throw new Error('Password hashing failed');
  }
}

/**
 * Compare a password with a hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} Match result
 */
export async function comparePassword(password, hash) {
  try {
    const match = await bcrypt.compare(password, hash);
    return match;
  } catch (error) {
    console.error('Error comparing password:', error);
    throw new Error('Password comparison failed');
  }
}

/**
 * Generate a JWT token
 * @param {Object} payload - Token payload
 * @param {string} expiresIn - Expiration time (default: 90d)
 * @returns {string} JWT token
 */
export function generateToken(payload, expiresIn = JWT_EXPIRY) {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }

  try {
    const token = jwt.sign(payload, secret, { expiresIn });
    return token;
  } catch (error) {
    console.error('Error generating token:', error);
    throw new Error('Token generation failed');
  }
}

/**
 * Verify a JWT token
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded payload or null
 */
export function verifyToken(token) {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }

  try {
    const decoded = jwt.verify(token, secret);
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      console.log('Token expired');
    } else if (error.name === 'JsonWebTokenError') {
      console.log('Invalid token');
    } else {
      console.error('Token verification error:', error);
    }
    return null;
  }
}

/**
 * Extract user data from token (without sensitive info)
 * @param {Object} user - User object from database
 * @returns {Object} Safe user data
 */
export function getSafeUserData(user) {
  const { password, ...safeUser } = user;
  return safeUser;
}

