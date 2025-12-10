'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import { register, getPocketBase } from '@/lib/pocketbase';
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

export default function SignupPage() {
  return (
    <Suspense fallback={<Loading />}>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    passwordConfirm: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [updatingPhone, setUpdatingPhone] = useState(false);

  const getParam = (key: string) => {
    const value = searchParams?.get(key);
    return value && value.trim() ? value : null;
  };

  useEffect(() => {
    // Check if redirected from Google auth and needs phone
    const needsPhone = getParam('needsPhone') === 'true';
    const googleAuth = getParam('googleAuth') === 'true';
    
    if (needsPhone && googleAuth) {
      setShowPhoneModal(true);
    } else {
      // Initialize Google Sign-In when script loads
      if (window.google) {
        handleGoogleSignup();
      }
    }
  }, [searchParams]);

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
              
              // If new user and needs phone, show phone collection modal
              if (data.isNewUser && data.needsPhone) {
                setShowPhoneModal(true);
                setLoading(false);
              } else {
                // Existing user or phone already set - go to events
                router.push('/events');
                router.refresh();
              }
            } else {
              setError(data.error || 'Signup failed');
              setLoading(false);
            }
          } catch (err: any) {
            setError(err.message || 'Signup failed');
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
            if (errorMessage.includes('invalid_client') || errorMessage.includes('no registered origin')) {
              setError(
                'Google Sign-In configuration error. ' +
                'Please add this origin to Google Cloud Console: ' +
                window.location.origin +
                '\n\nSee GOOGLE_SIGNIN_SETUP.md for instructions.'
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
        document.getElementById('google-signup-button'),
        {
          theme: 'outline',
          size: 'large',
          width: buttonWidth,
          text: 'signup_with',
        }
      );
    } catch (err: any) {
      setError(err.message || 'Failed to initialize Google Sign-In');
      setLoading(false);
    }
  }

  async function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Validate phone number - minimum 10 digits
    const phoneDigits = phoneNumber.replace(/\D/g, ''); // Remove all non-digits
    if (phoneDigits.length < 10) {
      setError('Phone number must have at least 10 digits');
      return;
    }

    setUpdatingPhone(true);
    setError('');

    try {
      const pb = getPocketBase();
      const user = pb.authStore.model;
      
      if (!user || !pb.authStore.token) {
        setError('Not authenticated. Please try again.');
        setUpdatingPhone(false);
        return;
      }

      // Update phone number directly
      const updated = await pb.collection('customers').update(user.id, {
        phone: phoneNumber.trim(),
      });

      // Update auth store with new user data
      pb.authStore.save(pb.authStore.token, updated);
      
      // Redirect to events
      router.push('/events');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to update phone number');
      setUpdatingPhone(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(180deg, #02060D 0%, #0A1320 50%, #132233 100%)',
      }}
    >
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => {
          if (window.google) {
            handleGoogleSignup();
          }
        }}
      />
      {/* Phone Number Collection Modal */}
      {showPhoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-md bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl rounded-3xl">
            <CardHeader className="text-center space-y-2">
              <CardTitle className="text-2xl font-bold text-white">Complete Your Profile</CardTitle>
              <CardDescription className="text-gray-300">Please provide your phone number to continue</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePhoneSubmit} className="space-y-4">
                {error && (
                  <div className="bg-red-500/10 border-2 border-red-500/20 text-red-200 px-4 py-3 rounded-xl text-sm font-medium backdrop-blur-sm">
                    {error}
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="phone-modal" className="text-white font-semibold">Phone Number *</Label>
                  <Input
                    id="phone-modal"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+91 9876543210"
                    required
                    autoFocus
                    className="bg-white/5 border-2 border-white/10 focus:border-[#7cffd6] rounded-xl text-white placeholder:text-gray-500"
                  />
                  <p className="text-xs text-gray-400">Required for account verification</p>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-[#7cffd6] hover:bg-[#52C4A3] text-white font-semibold py-3 rounded-xl shadow-lg shadow-[#7cffd6]/20" 
                  disabled={updatingPhone}
                >
                  {updatingPhone ? 'Updating...' : 'Continue'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="w-full max-w-md bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl rounded-3xl">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-bold text-white">Create Account</CardTitle>
          <CardDescription className="text-gray-300">Sign up to start buying tickets</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div id="google-signup-button" className="w-full min-h-[42px] flex items-center justify-center"></div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/20" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-transparent px-2 text-gray-400 font-medium">Or sign up with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border-2 border-red-500/20 text-red-200 px-4 py-3 rounded-xl text-sm font-medium backdrop-blur-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name" className="text-white font-semibold">Full Name</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
                required
                className="bg-white/5 border-2 border-white/10 focus:border-[#7cffd6] rounded-xl text-white placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-white font-semibold">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="you@example.com"
                required
                className="bg-white/5 border-2 border-white/10 focus:border-[#7cffd6] rounded-xl text-white placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-white font-semibold">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 9876543210"
                required
                className="bg-white/5 border-2 border-white/10 focus:border-[#7cffd6] rounded-xl text-white placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white font-semibold">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                required
                minLength={8}
                className="bg-white/5 border-2 border-white/10 focus:border-[#7cffd6] rounded-xl text-white placeholder:text-gray-500"
              />
              <p className="text-xs text-gray-400">Must be at least 8 characters</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="passwordConfirm" className="text-white font-semibold">Confirm Password</Label>
              <Input
                id="passwordConfirm"
                type="password"
                value={formData.passwordConfirm}
                onChange={(e) => setFormData({ ...formData, passwordConfirm: e.target.value })}
                placeholder="••••••••"
                required
                className="bg-white/5 border-2 border-white/10 focus:border-[#7cffd6] rounded-xl text-white placeholder:text-gray-500"
              />
            </div>

            <Button type="submit" className="w-full bg-[#7cffd6] hover:bg-[#52C4A3] text-white font-semibold py-3 rounded-xl shadow-lg shadow-[#7cffd6]/20" disabled={loading}>
              {loading ? 'Creating account...' : 'Sign Up'}
            </Button>
          </form>

          <div className="text-center text-sm">
            <span className="text-gray-400">Already have an account? </span>
            <Link href="/login" className="text-[#7cffd6] hover:text-[#52C4A3] hover:underline font-semibold">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

