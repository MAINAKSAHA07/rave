'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/pocketbase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function BackofficeHome() {
  const router = useRouter();

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.push('/login');
      return;
    }

    // Check backoffice access - allow admin/super_admin roles automatically
    // Also allow if backoffice_access is explicitly set to true
    const hasAccess = 
      user.role === 'admin' || 
      user.role === 'super_admin' || 
      user.backoffice_access === true;

    if (!hasAccess) {
      alert('You do not have backoffice access. Please contact an administrator.');
      router.push('/login');
      return;
    }

    // Redirect based on role - prioritize admin/super_admin to admin page
    if (user.role === 'admin' || user.role === 'super_admin') {
      router.replace('/admin');
    } else if (user.backoffice_access) {
      router.replace('/organizer');
    } else {
      router.push('/login');
    }
  }, [router]);

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Powerglide Backoffice</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/organizer" className="p-6 border rounded-lg hover:bg-gray-100">
            <h2 className="text-2xl font-semibold mb-2">Organizer Dashboard</h2>
            <p>Manage your events, venues, and sales</p>
          </Link>
          
          <Link href="/admin" className="p-6 border rounded-lg hover:bg-gray-100">
            <h2 className="text-2xl font-semibold mb-2">Admin Console</h2>
            <p>Platform administration and monitoring</p>
          </Link>
          
          <Link href="/checkin" className="p-6 border rounded-lg hover:bg-gray-100">
            <h2 className="text-2xl font-semibold mb-2">Check-In</h2>
            <p>Scan tickets and manage check-ins</p>
          </Link>
        </div>
      </div>
    </main>
  );
}

