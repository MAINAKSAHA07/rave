import express from 'express';
import { getPocketBase } from '../lib/pocketbase';

const router = express.Router();

// Get email templates
router.get('/', async (req, res, next) => {
  try {
    const pb = getPocketBase();
    const { organizerId, type } = req.query;
    
    let filter = '';
    if (organizerId) {
      filter += `organizer_id="${organizerId}"`;
    } else {
      filter += 'organizer_id=null';
    }
    if (type) {
      if (filter) filter += ' && ';
      filter += `type="${type}"`;
    }

    const templates = await pb.collection('email_templates').getFullList({
      filter: filter || undefined,
      sort: 'type',
    });

    res.json(templates);
  } catch (error: any) {
    next(error);
  }
});

// Get single template
router.get('/:id', async (req, res, next) => {
  try {
    const pb = getPocketBase();
    const template = await pb.collection('email_templates').getOne(req.params.id);
    res.json(template);
  } catch (error: any) {
    next(error);
  }
});

// Create or update email template
router.post('/', async (req, res, next) => {
  try {
    const { organizerId, type, subjectTemplate, bodyTemplate, isActive } = req.body;
    const pb = getPocketBase();

    // Check if template already exists
    let filter = `type="${type}"`;
    if (organizerId) {
      filter += ` && organizer_id="${organizerId}"`;
    } else {
      filter += ' && organizer_id=null';
    }

    try {
      const existing = await pb.collection('email_templates').getFirstListItem(filter);
      
      // Update existing template
      const updated = await pb.collection('email_templates').update(existing.id, {
        subject_template: subjectTemplate,
        body_template: bodyTemplate,
        is_active: isActive !== undefined ? isActive : true,
      });
      res.json(updated);
    } catch (error: any) {
      // Template doesn't exist, create new one
      const created = await pb.collection('email_templates').create({
        organizer_id: organizerId || null,
        type,
        subject_template: subjectTemplate,
        body_template: bodyTemplate,
        is_active: isActive !== undefined ? isActive : true,
      });
      res.json(created);
    }
  } catch (error: any) {
    next(error);
  }
});

// Update email template
router.patch('/:id', async (req, res, next) => {
  try {
    const { subjectTemplate, bodyTemplate, isActive } = req.body;
    const pb = getPocketBase();

    const updateData: any = {};
    if (subjectTemplate !== undefined) updateData.subject_template = subjectTemplate;
    if (bodyTemplate !== undefined) updateData.body_template = bodyTemplate;
    if (isActive !== undefined) updateData.is_active = isActive;

    const updated = await pb.collection('email_templates').update(req.params.id, updateData);
    res.json(updated);
  } catch (error: any) {
    next(error);
  }
});

// Delete email template
router.delete('/:id', async (req, res, next) => {
  try {
    const pb = getPocketBase();
    await pb.collection('email_templates').delete(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    next(error);
  }
});

export default router;

