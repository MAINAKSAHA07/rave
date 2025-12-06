'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getPocketBase } from '@/lib/pocketbase';
import Loading from '@/components/Loading';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    async function handleCallback() {
      try {
        const pb = getPocketBase();
        const code = searchParams.get('code');
        const state = searchParams.get('state');

        if (!code || !state) {
          throw new Error('Missing OAuth parameters');
        }

        // Complete OAuth2 flow
        await pb.collection('customers').authWithOAuth2({
          provider: 'google',
          code,
          codeVerifier: sessionStorage.getItem('oauth_code_verifier') || '',
          redirectUrl: `${window.location.origin}/auth/callback`,
        });

        // Get redirect URL from sessionStorage
        const redirect = sessionStorage.getItem('oauth_redirect') || '/events';
        sessionStorage.removeItem('oauth_redirect');
        sessionStorage.removeItem('oauth_code_verifier');

        setStatus('success');
        router.push(redirect);
      } catch (err: any) {
        console.error('OAuth callback error:', err);
        setError(err.message || 'Authentication failed');
        setStatus('error');
      }
    }

    handleCallback();
  }, [router, searchParams]);

  if (status === 'loading') {
    return <Loading />;
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-4xl mb-4">✕</div>
          <h1 className="text-2xl font-bold mb-2">Authentication Failed</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<Loading />}>
      <AuthCallbackContent />
    </Suspense>
  );
}

