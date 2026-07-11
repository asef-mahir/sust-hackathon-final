import { createServerClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';

/**
 * @returns {Promise<Object | null>} the Owner row, or null if unauthenticated
 */
export async function getSessionOwner() {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const owner = await prisma.owner.findUnique({ where: { id: user.id } });
  return owner;
}