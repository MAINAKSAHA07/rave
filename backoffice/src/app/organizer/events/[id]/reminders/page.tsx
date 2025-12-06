'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getPocketBase, getCurrentUser } from '@/lib/pocketbase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import Loading from '@/components/Loading';

export default function EventRemindersPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const [event, setEvent] = useState<any>(null);
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [reminderForm, setReminderForm] = useState({
    reminderOffsetHours: 24,
    isEnabled: true,
  });
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [eventId]);

  async function loadData() {
    try {
      const user = getCurrentUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }

      const pb = getPocketBase();

      // Load event
      const eventData = await pb.collection('events').getOne(eventId, {
        expand: 'venue_id,organizer_id',
      });
      setEvent(eventData as any);

      // Load reminders for this event
      const remindersData = await pb.collection('event_reminders').getFullList({
        filter: `event_id="${eventId}"`,
        sort: 'reminder_offset_hours',
      });
      setReminders(remindersData as any);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddReminder() {
    if (!reminderForm.reminderOffsetHours || reminderForm.reminderOffsetHours <= 0) {
      alert('Please enter a valid reminder offset (hours before event)');
      return;
    }

    setSaveLoading(true);
    try {
      const pb = getPocketBase();

      // Check if reminder with same offset already exists
      const existing = reminders.find(
        (r) => r.reminder_offset_hours === reminderForm.reminderOffsetHours
      );

      if (existing) {
        // Update existing
        await pb.collection('event_reminders').update(existing.id, {
          is_enabled: reminderForm.isEnabled,
        });
      } else {
        // Create new
        await pb.collection('event_reminders').create({
          event_id: eventId,
          reminder_offset_hours: reminderForm.reminderOffsetHours,
          is_enabled: reminderForm.isEnabled,
        });
      }

      alert('Reminder configuration saved!');
      setShowAddDialog(false);
      setReminderForm({ reminderOffsetHours: 24, isEnabled: true });
      await loadData();
    } catch (error: any) {
      console.error('Failed to save reminder:', error);
      alert(`Error: ${error.response?.data?.message || error.message || 'Failed to save reminder'}`);
    } finally {
      setSaveLoading(false);
    }
  }

  async function handleToggleReminder(reminderId: string, currentStatus: boolean) {
    try {
      const pb = getPocketBase();
      await pb.collection('event_reminders').update(reminderId, {
        is_enabled: !currentStatus,
      });
      await loadData();
    } catch (error: any) {
      console.error('Failed to toggle reminder:', error);
      alert(`Error: ${error.response?.data?.message || error.message || 'Failed to update reminder'}`);
    }
  }

  async function handleDeleteReminder(reminderId: string) {
    if (!confirm('Delete this reminder configuration?')) {
      return;
    }

    try {
      const pb = getPocketBase();
      await pb.collection('event_reminders').delete(reminderId);
      await loadData();
    } catch (error: any) {
      console.error('Failed to delete reminder:', error);
      alert(`Error: ${error.response?.data?.message || error.message || 'Failed to delete reminder'}`);
    }
  }

  function getReminderDescription(hours: number) {
    if (hours < 1) {
      return `${Math.round(hours * 60)} minutes before event`;
    } else if (hours < 24) {
      return `${hours} hour${hours !== 1 ? 's' : ''} before event`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      if (remainingHours === 0) {
        return `${days} day${days !== 1 ? 's' : ''} before event`;
      } else {
        return `${days} day${days !== 1 ? 's' : ''} and ${remainingHours} hour${remainingHours !== 1 ? 's' : ''} before event`;
      }
    }
  }

  if (loading) {
    return <Loading />;
  }

  if (!event) {
    return <div className="p-8">Event not found</div>;
  }

  const eventStart = new Date(event.start_date);

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Event Reminders</h1>
            <p className="text-gray-600 mt-2">{event.name}</p>
            <p className="text-sm text-gray-500 mt-1">
              Event Date: {eventStart.toLocaleDateString('en-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(`/organizer/events/${eventId}`)}>
              Back to Event
            </Button>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>Add Reminder</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Configure Event Reminder</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="offset">Hours Before Event *</Label>
                    <Input
                      id="offset"
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={reminderForm.reminderOffsetHours}
                      onChange={(e) =>
                        setReminderForm({
                          ...reminderForm,
                          reminderOffsetHours: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Reminder will be sent {getReminderDescription(reminderForm.reminderOffsetHours)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Common values: 24 (1 day), 48 (2 days), 168 (1 week)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="enabled"
                      checked={reminderForm.isEnabled}
                      onCheckedChange={(checked) =>
                        setReminderForm({ ...reminderForm, isEnabled: checked })
                      }
                    />
                    <Label htmlFor="enabled">Enabled</Label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddReminder} disabled={saveLoading}>
                      {saveLoading ? 'Saving...' : 'Save Reminder'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configured Reminders ({reminders.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {reminders.length === 0 ? (
              <p className="text-gray-500">
                No reminders configured. Add a reminder to automatically send email notifications to ticket holders.
              </p>
            ) : (
              <div className="space-y-4">
                {reminders.map((reminder) => {
                  const reminderTime = new Date(
                    eventStart.getTime() - reminder.reminder_offset_hours * 60 * 60 * 1000
                  );
                  const isPast = reminderTime < new Date();

                  return (
                    <div key={reminder.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="font-semibold">
                            {getReminderDescription(reminder.reminder_offset_hours)}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Will be sent on: {reminderTime.toLocaleString('en-IN')}
                            {isPast && <span className="text-red-600 ml-2">(Past)</span>}
                          </p>
                          {reminder.last_sent_at && (
                            <p className="text-xs text-gray-500 mt-1">
                              Last sent: {new Date(reminder.last_sent_at).toLocaleString('en-IN')}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={reminder.is_enabled}
                              onCheckedChange={() =>
                                handleToggleReminder(reminder.id, reminder.is_enabled)
                              }
                            />
                            <span className="text-sm">
                              {reminder.is_enabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteReminder(reminder.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>How Reminders Work</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-600">
              <p>
                • Reminders are automatically sent to all customers who have purchased tickets for this event.
              </p>
              <p>
                • The system checks for reminders every hour and sends them at the configured time.
              </p>
              <p>
                • Each reminder is sent only once per event.
              </p>
              <p>
                • You can configure multiple reminders (e.g., 1 week before, 1 day before, 2 hours before).
              </p>
              <p>
                • Reminders use the "Event Reminder" email template, which you can customize in Email Templates.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

