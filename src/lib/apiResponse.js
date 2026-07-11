import { NextResponse } from 'next/server';

/**
 * @param {*} data
 * @param {string} [message]
 * @param {number} [status]
 * @returns {NextResponse}
 */
export function successResponse(data, message = 'Success', status = 200) {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
      error: null,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * @param {string} message
 * @param {number} [status]
 * @param {*} [errorDetails] - e.g. zod's flattened validation error
 * @returns {NextResponse}
 */
export function errorResponse(message, status = 500, errorDetails = null) {
  return NextResponse.json(
    {
      success: false,
      message,
      data: null,
      error: errorDetails,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}