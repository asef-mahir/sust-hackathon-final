import { createServerClient } from '@/utils/supabase/server';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { prisma } from '@/lib/prisma';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    
    if (!body || !body.email || !body.password) {
      return errorResponse('Email and password are required in the request body.', 400);
    }

    const { email, password } = body;
    const supabase = await createServerClient();

    // 1. Authenticate with Supabase
    // This automatically sets the session cookies via the setAll() method we defined
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return errorResponse(error.message, 401);
    }

    // 2. Verify the user exists in our local database and fetch their role
    const owner = await prisma.owner.findUnique({
      where: { id: data.user.id },
      select: { role: true },
    });

    if (!owner) {
      // Security measure: if they exist in Supabase but not in our DB, deny access.
      await supabase.auth.signOut();
      return errorResponse('Authenticated, but no matching Owner profile found in system.', 403);
    }

    // 3. Return a successful standardized response
    return successResponse(
      {
        user: {
          id: data.user.id,
          email: data.user.email,
          role: owner.role,
        },
      },
      'Login successful.'
    );
  } catch (error) {
    console.error('[POST /api/login]', error);
    return errorResponse('Internal server error during login.', 500);
  }
}