import { redirect } from 'next/navigation';
import { getSessionOwner } from '@/lib/getSessionOwner';

export default async function LoginLayout({ children }) {
  // 1. Check if the user is already authenticated
  const owner = await getSessionOwner();

  // 2. If they are, instantly redirect them to the Command Center
  if (owner) {
    redirect('/');
  }

  // 3. Otherwise, render the login page normally
  return <>{children}</>;
}