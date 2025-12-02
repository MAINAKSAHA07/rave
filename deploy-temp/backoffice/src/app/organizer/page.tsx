'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/pocketbase';

export default function OrganizerPage() {
  const router = useRouter();

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.push('/login');
      return;
    }

    // Check backoffice access
    const hasAccess = 
      user.role === 'admin' || 
      user.role === 'super_admin' || 
      user.backoffice_access === true;

    if (!hasAccess) {
      alert('You do not have backoffice access.');
      router.push('/login');
      return;
    }

    // Redirect to dashboard
    router.push('/organizer/dashboard');
  }, [router]);

  return <div>Redirecting...</div>;
}

