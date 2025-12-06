'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { register } from '@/lib/pocketbase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    passwordConfirm: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.passwordConfirm) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    try {
      await register(
        formData.email,
        formData.password,
        formData.name,
        formData.phone
      );
      router.push('/events');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignup() {
    setLoading(true);
    setError('');

    try {
      const { getPocketBase } = await import('@/lib/pocketbase');
      const pb = getPocketBase();

      // PocketBase OAuth2 flow
      await pb.collection('customers').authWithOAuth2({
        provider: 'google',
        urlCallback: (url: string) => {
          // Store redirect URL in sessionStorage
          sessionStorage.setItem('oauth_redirect', '/events');
          // Redirect to OAuth provider
          window.location.href = url;
        },
      });

      // This will only execute if OAuth completes synchronously (unlikely)
      router.push('/events');
    } catch (err: any) {
      // OAuth redirects away, so this might not execute
      setError(err.message || 'Google signup failed. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Card className="w-full bg-white/90 backdrop-blur-sm border border-white/50 shadow-xl rounded-3xl overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 to-purple-500"></div>
        <CardHeader className="text-center space-y-3 pb-8 pt-8">
          <div className="mx-auto w-12 h-12 bg-pink-100 rounded-2xl flex items-center justify-center text-2xl mb-2">
            ✨
          </div>
          <CardTitle className="text-3xl font-black text-gray-900 tracking-tight">Create Account</CardTitle>
          <CardDescription className="text-gray-500 font-medium">Join us to start booking tickets</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-8 pb-10">
          <Button
            onClick={handleGoogleSignup}
            disabled={loading}
            className="w-full bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 shadow-sm transition-all hover:scale-[1.01] hover:shadow-md h-12 rounded-xl text-sm font-semibold"
            variant="outline"
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-100" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wider font-semibold">
              <span className="bg-white/90 px-3 text-gray-400">Or sign up with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50/50 backdrop-blur-sm border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
                <span>⚠️</span> {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-700 font-semibold text-sm">Full Name</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
                required
                className="bg-gray-50/50 border-gray-200 focus:bg-white focus:border-purple-500 h-12 rounded-xl transition-all"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 font-semibold text-sm">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="you@example.com"
                required
                className="bg-gray-50/50 border-gray-200 focus:bg-white focus:border-purple-500 h-12 rounded-xl transition-all"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-gray-700 font-semibold text-sm">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 9876543210"
                required
                className="bg-gray-50/50 border-gray-200 focus:bg-white focus:border-purple-500 h-12 rounded-xl transition-all"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 font-semibold text-sm">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                required
                minLength={8}
                className="bg-gray-50/50 border-gray-200 focus:bg-white focus:border-purple-500 h-12 rounded-xl transition-all"
              />
              <p className="text-xs text-gray-500 font-medium bg-gray-50 py-1 px-2 rounded-lg inline-block">Must be at least 8 characters</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="passwordConfirm" className="text-gray-700 font-semibold text-sm">Confirm Password</Label>
              <Input
                id="passwordConfirm"
                type="password"
                value={formData.passwordConfirm}
                onChange={(e) => setFormData({ ...formData, passwordConfirm: e.target.value })}
                placeholder="••••••••"
                required
                className="bg-gray-50/50 border-gray-200 focus:bg-white focus:border-purple-500 h-12 rounded-xl transition-all"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white h-12 rounded-xl text-base font-bold shadow-lg shadow-purple-500/20 transition-all hover:scale-[1.02] active:scale-95"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating Account...</span>
                </div>
              ) : 'Sign Up'}
            </Button>
          </form>

          <div className="text-center text-sm pt-2">
            <span className="text-gray-500">Already have an account? </span>
            <Link href="/login" className="text-purple-600 hover:text-purple-700 font-bold hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

