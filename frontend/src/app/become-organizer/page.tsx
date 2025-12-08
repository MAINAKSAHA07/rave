'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPocketBase } from '@/lib/pocketbase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Rocket } from 'lucide-react';

export default function OrganizerApplyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    gst_number: '',
    event_description: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setIsLaunching(true);

    try {
      const pb = getPocketBase();

      // Prepare data - only include gst_number if it's not empty
      const applicationData: any = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        event_description: formData.event_description.trim(),
      };

      // Only include gst_number if it's provided
      if (formData.gst_number && formData.gst_number.trim()) {
        applicationData.gst_number = formData.gst_number.trim();
      }

      // Submit application (public access) - ensure status defaults to "pending"
      await pb.collection('organizer_applications').create({
        ...applicationData,
        status: 'pending',
      });

      // Keep the rocket flying for a bit before showing success
      await new Promise(resolve => setTimeout(resolve, 1500));

      setMessage({
        type: 'success',
        text: 'Your application has been submitted successfully! Our team will review it and get back to you soon.',
      });

      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        gst_number: '',
        event_description: '',
      });

      // Optionally redirect after a delay
      setTimeout(() => {
        router.push('/');
      }, 3000);
    } catch (error: any) {
      console.error('Failed to submit application:', error);
      setIsLaunching(false); // Stop animation on error

      // Extract detailed error message
      let errorMessage = 'Failed to submit application. Please try again.';

      if (error.response?.data) {
        const data = error.response.data;
        if (data.message) {
          errorMessage = data.message;
        } else if (data.data) {
          // PocketBase validation errors
          const fieldErrors = Object.entries(data.data)
            .map(([field, errors]: [string, any]) => {
              const errorList = Array.isArray(errors) ? errors : [errors];
              return `${field}: ${errorList.map((e: any) => e.message || e).join(', ')}`;
            })
            .join('; ');
          errorMessage = `Validation error: ${fieldErrors}`;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      setMessage({
        type: 'error',
        text: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen p-4 flex items-center justify-center"
      style={{
        background: 'linear-gradient(180deg, #02060D 0%, #0A1320 50%, #132233 100%)',
      }}
    >
      <div className="w-full relative max-w-lg">
        <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center text-white">
              Become an Organizer
            </CardTitle>
            <CardDescription className="text-center mt-2 text-gray-300">
              Join Powerglide and start hosting amazing events.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {message && (
              <div
                className={`p-4 rounded-xl mb-6 border ${message.type === 'success'
                  ? 'bg-green-500/20 text-green-200 border-green-500/40'
                  : 'bg-red-500/20 text-red-200 border-red-500/40'
                  }`}
              >
                <p className="font-medium flex items-center gap-2">
                  {message.type === 'success' ? '🚀' : '⚠️'} {message.text}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-300">
                  Organization/Company Name <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter your organization name"
                  disabled={loading}
                  className="bg-white/5 border-white/10 text-white placeholder-gray-500 focus:border-purple-500 focus:bg-white/10 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-300">
                    Email Address <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="your@email.com"
                    disabled={loading}
                    className="bg-white/5 border-white/10 text-white placeholder-gray-500 focus:border-purple-500 focus:bg-white/10 transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-gray-300">
                    Phone Number <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 1234567890"
                    disabled={loading}
                    className="bg-white/5 border-white/10 text-white placeholder-gray-500 focus:border-purple-500 focus:bg-white/10 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gst_number" className="text-gray-300">GST Number (Optional)</Label>
                <Input
                  id="gst_number"
                  type="text"
                  value={formData.gst_number}
                  onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                  placeholder="29ABCDE1234F1Z5"
                  disabled={loading}
                  className="bg-white/5 border-white/10 text-white placeholder-gray-500 focus:border-purple-500 focus:bg-white/10 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="event_description" className="text-gray-300">
                  Tell us about your events <span className="text-red-400">*</span>
                </Label>
                <Textarea
                  id="event_description"
                  required
                  value={formData.event_description}
                  onChange={(e) => setFormData({ ...formData, event_description: e.target.value })}
                  placeholder="Describe the types of events you plan to host..."
                  rows={4}
                  disabled={loading}
                  className="resize-none bg-white/5 border-white/10 text-white placeholder-gray-500 focus:border-purple-500 focus:bg-white/10 transition-colors"
                />
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  className={`w-full h-12 text-base font-semibold relative overflow-hidden transition-all duration-500 shadow-lg shadow-purple-900/20 ${isLaunching ? 'bg-purple-600 text-transparent' : 'bg-purple-600 hover:bg-purple-700 text-white'
                    }`}
                  disabled={loading}
                >
                  <span className={`flex items-center justify-center gap-2 ${isLaunching ? 'opacity-0' : 'opacity-100'}`}>
                    Submit Application
                  </span>

                  {/* Rocket Animation */}
                  <div
                    className={`absolute left-1/2 -translate-x-1/2 transition-all duration-1000 ease-in-out ${isLaunching ? 'bottom-[120%] opacity-0' : 'bottom-1/2 translate-y-1/2 opacity-0'
                      }`}
                    style={{
                      transitionProperty: 'bottom, opacity',
                      transitionDuration: '1.5s',
                      transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                  >
                    <Rocket className={`w-8 h-8 text-white ${isLaunching ? 'block' : 'hidden'}`} />
                  </div>

                  {/* Initial Rocket Position (Visible only when launching starts) */}
                  {isLaunching && (
                    <div className="absolute inset-0 flex items-center justify-center animate-rocket-launch">
                      <Rocket className="w-8 h-8 text-white" />
                    </div>
                  )}
                </Button>
              </div>

              <div className="text-center text-sm text-gray-400 pt-4 border-t border-white/10">
                <p>
                  By submitting this application, you agree to our terms and conditions.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <Button
            variant="ghost"
            onClick={() => router.push('/')}
            className="text-white hover:text-gray-300 hover:bg-white/10 transition-colors"
          >
            Back to Home
          </Button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes rocket-launch {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          20% { transform: translateY(10px) scale(0.9); }
          40% { transform: translateY(-10px) scale(1.1); }
          100% { transform: translateY(-200px) scale(0.5); opacity: 0; }
        }
        .animate-rocket-launch {
          animation: rocket-launch 1.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
      `}</style>
    </div>
  );
}

