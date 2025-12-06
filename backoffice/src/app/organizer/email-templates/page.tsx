'use client';

import { useEffect, useState } from 'react';
import { getPocketBase, getCurrentUser } from '@/lib/pocketbase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Loading from '@/components/Loading';

const TEMPLATE_TYPES = [
  { value: 'ticket_confirmation', label: 'Ticket Confirmation' },
  { value: 'event_reminder', label: 'Event Reminder' },
  { value: 'organizer_sales_daily', label: 'Daily Sales Report' },
  { value: 'organizer_sales_weekly', label: 'Weekly Sales Report' },
];

export default function EmailTemplatesPage() {
  const [user, setUser] = useState<any>(null);
  const [organizer, setOrganizer] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [templateForm, setTemplateForm] = useState({
    type: '',
    subjectTemplate: '',
    bodyTemplate: '',
    isActive: true,
  });
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        window.location.href = '/login';
        return;
      }

      setUser(currentUser);
      const pb = getPocketBase();

      // Super Admin or Admin: Allow access without organizer association
      if (currentUser.role === 'super_admin' || currentUser.role === 'admin') {
        // Load all templates (global + organizer-specific)
        await loadTemplates(null);
        setOrganizer({ 
          name: currentUser.role === 'super_admin' ? 'Super Admin View' : 'Admin View',
          description: 'Viewing all email templates'
        });
        setLoading(false);
        return;
      }

      const staffRecords = await pb.collection('organizer_staff').getFullList({
        filter: `user_id="${currentUser.id}" && status="active"`,
        expand: 'organizer_id',
      });

      if (staffRecords.length === 0) {
        setLoading(false);
        return;
      }

      const organizerId = staffRecords[0].organizer_id;
      setOrganizer(organizerId);

      await loadTemplates(organizerId.id);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadTemplates(organizerId: string | null) {
    try {
      const pb = getPocketBase();
      let filter = '';
      if (organizerId === null) {
        // Admin/Super Admin: Load all templates (global + organizer-specific)
        filter = '';
      } else {
        // Organizer staff: Load only their organizer's templates
        filter = `organizer_id="${organizerId}"`;
      }
      
      const templatesData = await pb.collection('email_templates').getFullList({
        filter: filter || undefined,
        sort: 'type,organizer_id',
      });
      setTemplates(templatesData as any);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  }

  function openEditDialog(template?: any) {
    if (template) {
      setSelectedTemplate(template);
      setTemplateForm({
        type: template.type,
        subjectTemplate: template.subject_template,
        bodyTemplate: template.body_template,
        isActive: template.is_active,
      });
    } else {
      setSelectedTemplate(null);
      setTemplateForm({
        type: '',
        subjectTemplate: '',
        bodyTemplate: '',
        isActive: true,
      });
    }
    setShowEditDialog(true);
  }

  async function handleSaveTemplate() {
    if (!templateForm.type || !templateForm.subjectTemplate || !templateForm.bodyTemplate) {
      alert('Please fill in all fields');
      return;
    }

    setSaveLoading(true);
    try {
      const pb = getPocketBase();
      
      if (selectedTemplate) {
        // Update existing
        await pb.collection('email_templates').update(selectedTemplate.id, {
          subject_template: templateForm.subjectTemplate,
          body_template: templateForm.bodyTemplate,
          is_active: templateForm.isActive,
        });
      } else {
        // Create new
        // For admin/super_admin, allow creating global templates (organizer_id = null)
        // For organizer staff, use their organizer_id
        const organizerId = (user?.role === 'super_admin' || user?.role === 'admin') 
          ? null 
          : organizer.id;
        
        await pb.collection('email_templates').create({
          organizer_id: organizerId,
          type: templateForm.type,
          subject_template: templateForm.subjectTemplate,
          body_template: templateForm.bodyTemplate,
          is_active: templateForm.isActive,
        });
      }

      alert('Template saved successfully!');
      setShowEditDialog(false);
      await loadTemplates((user?.role === 'super_admin' || user?.role === 'admin') ? null : organizer.id);
    } catch (error: any) {
      console.error('Failed to save template:', error);
      alert(`Error: ${error.response?.data?.message || error.message || 'Failed to save template'}`);
    } finally {
      setSaveLoading(false);
    }
  }

  if (loading) {
    return <Loading />;
  }

  if (!organizer) {
    const currentUser = getCurrentUser();
    // Allow admin/super_admin to access even without organizer association
    if (currentUser?.role === 'super_admin' || currentUser?.role === 'admin') {
      // This shouldn't happen as we set a dummy organizer above, but just in case
      return (
        <div className="p-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-gray-600">
                Loading email templates...
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }
    
    return (
      <div className="p-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-600">
              You are not associated with an organizer. Please contact an administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Email Templates</h1>
            <p className="text-gray-600 mt-2">Customize email templates for your events</p>
          </div>
          <Button onClick={() => openEditDialog()}>Create Template</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Templates ({templates.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {templates.length === 0 ? (
              <p className="text-gray-500">No custom templates. Using platform defaults.</p>
            ) : (
              <div className="space-y-4">
                {templates.map((template) => (
                  <div key={template.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold">
                          {TEMPLATE_TYPES.find(t => t.value === template.type)?.label || template.type}
                        </h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          template.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {template.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(template)}>
                        Edit
                      </Button>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Subject:</strong> {template.subject_template.substring(0, 100)}...</p>
                      <p><strong>Body:</strong> {template.body_template.substring(0, 200)}...</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Available Template Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {TEMPLATE_TYPES.map((type) => {
                const exists = templates.some(t => t.type === type.value);
                return (
                  <div key={type.value} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">{type.label}</p>
                      <p className="text-sm text-gray-600">Type: {type.value}</p>
                    </div>
                    {exists ? (
                      <span className="text-sm text-green-600">Custom template exists</span>
                    ) : (
                      <span className="text-sm text-gray-500">Using default template</span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 p-4 bg-blue-50 rounded">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Templates use Handlebars syntax. Available variables: 
                {' '}{'{user_name}'}, {'{event_name}'}, {'{event_date}'}, {'{venue_name}'}, {'{ticket_list}'}, {'{order_number}'}, etc.
              </p>
            </div>
          </CardContent>
        </Card>

        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedTemplate ? 'Edit Template' : 'Create Template'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="type">Template Type *</Label>
                <Select
                  value={templateForm.type}
                  onValueChange={(value) => setTemplateForm({ ...templateForm, type: value })}
                  disabled={!!selectedTemplate}
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select template type" />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="subject">Subject Template *</Label>
                <Input
                  id="subject"
                  placeholder="e.g., Your tickets for {{event_name}}"
                  value={templateForm.subjectTemplate}
                  onChange={(e) => setTemplateForm({ ...templateForm, subjectTemplate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="body">Body Template (HTML) *</Label>
                <Textarea
                  id="body"
                  placeholder="<h1>Hello {{user_name}}</h1>..."
                  value={templateForm.bodyTemplate}
                  onChange={(e) => setTemplateForm({ ...templateForm, bodyTemplate: e.target.value })}
                  rows={15}
                  className="font-mono text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="active"
                  checked={templateForm.isActive}
                  onCheckedChange={(checked) => setTemplateForm({ ...templateForm, isActive: checked })}
                />
                <Label htmlFor="active">Active</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveTemplate} disabled={saveLoading}>
                  {saveLoading ? 'Saving...' : 'Save Template'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

