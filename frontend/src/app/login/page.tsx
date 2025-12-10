'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import { getPocketBase, login } from '@/lib/pocketbase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import Loading from '@/components/Loading';

declare global {
  interface Window {
    google: any;
  }
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Loading />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getRedirectPath = () => {
    const redirect = searchParams?.get('redirect');
    return redirect && redirect.trim() ? redirect : '/events';
  };

  useEffect(() => {
    // Check if already logged in
    const pb = getPocketBase();
    if (pb.authStore.isValid) {
      router.push(getRedirectPath());
      return;
    }

    // Initialize Google Sign-In when script loads
    if (window.google) {
      handleGoogleLogin();
    }
  }, [router, searchParams]);

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
      router.push(getRedirectPath());
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    if (!window.google) {
      setError('Google Sign-In is loading. Please wait...');
      return;
    }

    setLoading(true);
    setError('');

    const clientId =
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
      process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID ||
      '';

    if (!clientId) {
      setError('Google Client ID not configured');
      setLoading(false);
      return;
    }

    if (!clientId.endsWith('.apps.googleusercontent.com')) {
      setError(`Invalid Client ID format. Expected format: ...apps.googleusercontent.com\nGot: ${clientId.substring(0, 50)}...`);
      setLoading(false);
      return;
    }

    try {
      const redirect = getRedirectPath();

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: any) => {
          try {
            // Send the credential to your backend
            const loginResponse = await fetch('/api/auth/google', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ credential: response.credential }),
            });

            const data = await loginResponse.json();

            if (loginResponse.ok && data.token && data.record) {
              // Save to PocketBase auth store
              const pb = getPocketBase();
              pb.authStore.save(data.token, data.record);
              
              // If existing user, sign in directly
              if (!data.isNewUser) {
                router.push(redirect);
                router.refresh();
              } else {
                // New user - redirect to signup to collect phone number
                router.push(`/signup?googleAuth=true&needsPhone=true`);
              }
            } else {
              setError(data.error || 'Login failed');
              setLoading(false);
            }
          } catch (err: any) {
            setError(err.message || 'Login failed');
            setLoading(false);
          }
        },
        error_callback: (error: any) => {
          console.error('Google Sign-In error:', error);
          if (error.type === 'popup_closed') {
            setError('Sign-in popup was closed. Please try again.');
          } else if (error.type === 'popup_failed_to_open') {
            setError('Failed to open sign-in popup. Please check your browser settings.');
          } else if (error.type === 'popup_blocked') {
            setError('Sign-in popup was blocked. Please allow popups for this site.');
          } else {
            const errorMessage = error.message || 'Google Sign-In error';
            if (errorMessage.includes('invalid_client') || 
                errorMessage.includes('no registered origin') ||
                errorMessage.includes('not allowed') ||
                errorMessage.includes('403')) {
              const currentOrigin = window.location.origin;
              const redirectUri = `${currentOrigin}/auth/callback`;
              setError(
                `❌ Google OAuth Error: Origin not authorized\n\n` +
                `Current origin: ${currentOrigin}\n\n` +
                `To fix this:\n` +
                `1. Go to Google Cloud Console → APIs & Services → Credentials\n` +
                `2. Edit your OAuth 2.0 Client ID\n` +
                `3. Add to "Authorized JavaScript origins":\n` +
                `   ${currentOrigin}\n\n` +
                `4. Add to "Authorized redirect URIs":\n` +
                `   ${redirectUri}\n` +
                `   http://13.201.90.240:8092/api/oauth2/google/callback\n\n` +
                `5. Save and wait 1-2 minutes\n\n` +
                `See GOOGLE_OAUTH_SETUP.md for detailed instructions.`
              );
            } else {
              setError(errorMessage);
            }
          }
          setLoading(false);
        },
      });

      // Render the button
      const buttonWidth = Math.min(window.innerWidth - 64, 320);
      window.google.accounts.id.renderButton(
        document.getElementById('google-signin-button'),
        {
          theme: 'outline',
          size: 'large',
          width: buttonWidth,
          text: 'signin_with',
        }
      );

      // Also try one-tap sign-in
      window.google.accounts.id.prompt();
    } catch (err: any) {
      setError(err.message || 'Failed to initialize Google Sign-In');
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundColor: '#050509',
        backgroundImage: 'radial-gradient(circle at 20% 10%, rgba(168,85,247,0.18), rgba(59,130,246,0.12), rgba(12,10,24,0)), radial-gradient(circle at 80% 0%, rgba(196,181,253,0.14), rgba(12,10,24,0))',
      }}
    >
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => {
          if (window.google) {
            handleGoogleLogin();
          }
        }}
      />
      <Card className="w-full max-w-md bg-[#0f1014]/80 backdrop-blur-xl border border-white/12 shadow-2xl rounded-3xl" style={{ boxShadow: '0 14px 45px rgba(0,0,0,0.7)' }}>
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-bold text-white">Welcome Back</CardTitle>
          <CardDescription className="text-gray-300">Sign in to your account to continue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div id="google-signin-button" className="w-full min-h-[42px] flex items-center justify-center"></div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/20" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-transparent px-2 text-gray-400 font-medium">Or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border-2 border-red-500/20 text-red-200 px-4 py-3 rounded-xl text-sm font-medium backdrop-blur-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-white font-semibold">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="bg-white/5 border-2 border-white/10 focus:border-[#3B82F6] rounded-xl text-white placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-white font-semibold">Password</Label>
                <Link href="/forgot-password" className="text-sm btn-ghost">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="bg-white/5 border-2 border-white/10 focus:border-[#3B82F6] rounded-xl text-white placeholder:text-gray-500"
              />
            </div>

            <Button type="submit" className="w-full btn-primary" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="text-center text-sm text-gray-300">
            <span className="text-gray-400">Don&apos;t have an account? </span>
            <Link href="/signup" className="btn-ghost">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

