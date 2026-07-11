import { createClient } from '../utils/supabase/server';
import { prisma } from './prisma';

/**
 * @typedef {Object} AuthResult
 * @property {boolean} authorized
 * @property {number} [status] - present when authorized is false
 * @property {string} [message] - present when authorized is false
 * @property {Object} [user] - Supabase auth user, present when authorized is true
 * @property {Object} [owner] - Prisma Owner row, present when authorized is true
 */

/**
 * Verifies the request is authenticated AND the caller's Owner.role is in
 * the allowed list. 
 *
 * @param {string[]} allowedRoles - e.g. ['OPS'], ['OPS', 'RISK']
 * @returns {Promise<AuthResult>}
 */
export async function requireRole(allowedRoles) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      authorized: false,
      status: 401,
      message: 'Authentication required.',
    };
  }

  const owner = await prisma.owner.findUnique({ where: { id: user.id } });

  if (!owner) {
    return {
      authorized: false,
      status: 403,
      message: 'No matching Owner profile found for this account.',
    };
  }

  if (!allowedRoles.includes(owner.role)) {
    return {
      authorized: false,
      status: 403,
      message: `Role '${owner.role}' is not permitted to perform this action.`,
    };
  }

  return { authorized: true, user, owner };
}

/**
 * Looser check: authenticated, any role. Used by read endpoints that all
 * three roles (OPS, RISK, AGENT) can access.
 *
 * @returns {Promise<AuthResult>}
 */
export async function requireAuth() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      authorized: false,
      status: 401,
      message: 'Authentication required.',
    };
  }

  const owner = await prisma.owner.findUnique({ where: { id: user.id } });

  if (!owner) {
    return {
      authorized: false,
      status: 403,
      message: 'No matching Owner profile found for this account.',
    };
  }

  return { authorized: true, user, owner };
}