'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPocketBase } from '@/lib/pocketbase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

export default function OrganizerApplyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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
      
      // Submit application (public access)
      // Note: status defaults to 'pending' in the schema, so we don't need to set it
      await pb.collection('organizer_applications').create(applicationData);

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
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">Become an Organizer</CardTitle>
            <CardDescription className="text-center mt-2">
              Join Rave and start hosting amazing events. Fill out the form below and our team will review your application.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {message && (
              <div
                className={`p-4 rounded-lg mb-6 ${
                  message.type === 'success'
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                <p className="font-medium">{message.text}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Organization/Company Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter your organization name"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your@email.com"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  Phone Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 1234567890"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gst_number">GST Number (Optional)</Label>
                <Input
                  id="gst_number"
                  type="text"
                  value={formData.gst_number}
                  onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                  placeholder="29ABCDE1234F1Z5"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500">
                  If you have a GST number, please provide it. This helps with payment processing.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="event_description">
                  Tell us about your events <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="event_description"
                  required
                  value={formData.event_description}
                  onChange={(e) => setFormData({ ...formData, event_description: e.target.value })}
                  placeholder="Describe the types of events you plan to host, your experience, and any other relevant information..."
                  rows={6}
                  disabled={loading}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500">
                  Please provide details about the events you plan to organize, your experience in event management, and any other relevant information that will help us review your application.
                </p>
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                  size="lg"
                >
                  {loading ? 'Submitting...' : 'Submit Application'}
                </Button>
              </div>

              <div className="text-center text-sm text-gray-600 pt-4 border-t">
                <p>
                  By submitting this application, you agree to our terms and conditions.
                  Our team typically reviews applications within 2-3 business days.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <Button
            variant="outline"
            onClick={() => router.push('/')}
          >
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}

