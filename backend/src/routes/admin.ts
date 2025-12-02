import express from 'express';
import { getPocketBase } from '../lib/pocketbase';

const router = express.Router();

// Middleware to check admin or super admin
const requireAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Invalid token format' });
    }

    // Create a separate client for user authentication to avoid conflicts with admin auth
    const { createUserClient } = await import('../lib/pocketbase');
    const userClient = createUserClient(token);

    try {
      // Verify the token is valid by refreshing it
      await userClient.collection('users').authRefresh();
    } catch (e: any) {
      console.error('Token validation failed:', e.message);
      return res.status(401).json({ error: 'Invalid token' });
    }

    const user = userClient.authStore.model;
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return res.status(403).json({ error: 'Requires Admin role' });
    }

    (req as any).user = user;
    next();
  } catch (error) {
    console.error('Auth check failed:', error);
    res.status(500).json({ error: 'Auth check failed' });
  }
};

// Middleware to check super admin
const requireSuperAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Invalid token format' });
    }

    // Create a separate client for user authentication to avoid conflicts with admin auth
    const { createUserClient } = await import('../lib/pocketbase');
    const userClient = createUserClient(token);

    try {
      // Verify the token is valid by refreshing it
      await userClient.collection('users').authRefresh();
    } catch (e: any) {
      console.error('Token validation failed:', e.message);
      return res.status(401).json({ error: 'Invalid token' });
    }

    const user = userClient.authStore.model;
    if (!user || user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Requires Super Admin role' });
    }

    (req as any).user = user;
    next();
  } catch (error) {
    console.error('Auth check failed:', error);
    res.status(500).json({ error: 'Auth check failed' });
  }
};

// Approve organizer application
router.post('/organizers/:applicationId/approve', requireAdmin, async (req, res, next) => {
  try {
    const pb = getPocketBase();
    const approvedBy = (req as any).user.id;

    // Save user token
    const userToken = pb.authStore.token;

    // Authenticate as admin to bypass access rules
    const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
    const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      return res.status(500).json({ error: 'Admin credentials not configured' });
    }

    await pb.admins.authWithPassword(adminEmail, adminPassword);

    // Get application using admin auth
    const application = await pb.collection('organizer_applications').getOne(req.params.applicationId);

    if (application.status !== 'pending') {
      // Restore user token before returning
      if (userToken) {
        pb.authStore.save(userToken, null);
      }
      return res.status(400).json({ error: 'Application already processed' });
    }

    // Check if organizer with same email already exists
    try {
      const existingOrganizer = await pb.collection('organizers').getFirstListItem(`email="${application.email}"`);
      // If organizer exists, just update the application status
      await pb.collection('organizer_applications').update(req.params.applicationId, {
        status: 'approved',
        reviewed_by: approvedBy,
        reviewed_at: new Date().toISOString(),
      });

      // Send approval email to organizer
      try {
        const { sendOrganizerApprovalEmail } = await import('../lib/email');
        const backofficeUrl = process.env.BACKOFFICE_URL || process.env.NEXT_PUBLIC_BACKOFFICE_URL || 'http://localhost:3002';
        const dashboardUrl = `${backofficeUrl}/organizer/dashboard`;

        await sendOrganizerApprovalEmail(
          application.email,
          application.name,
          dashboardUrl
        );
        console.log(`Approval email sent to ${application.email}`);
      } catch (emailError: any) {
        // Log email error but don't fail the approval
        console.error('Failed to send approval email:', emailError);
      }

      // Restore user token
      if (userToken) {
        pb.authStore.save(userToken, null);
      }

      return res.json({
        organizer: existingOrganizer,
        application,
        message: 'Organizer already exists for this email'
      });
    } catch (e: any) {
      // Organizer doesn't exist, create it
      if (e.status !== 404) {
        throw e;
      }
    }

    // Create organizer record
    const organizer = await pb.collection('organizers').create({
      name: application.name,
      email: application.email,
      phone: application.phone,
      gst_number: application.gst_number || undefined,
      status: 'approved',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    });

    // Update application
    await pb.collection('organizer_applications').update(req.params.applicationId, {
      status: 'approved',
      reviewed_by: approvedBy,
      reviewed_at: new Date().toISOString(),
    });

    // Send approval email to organizer
    try {
      const { sendOrganizerApprovalEmail } = await import('../lib/email');
      const backofficeUrl = process.env.BACKOFFICE_URL || process.env.NEXT_PUBLIC_BACKOFFICE_URL || 'http://localhost:3002';
      const dashboardUrl = `${backofficeUrl}/organizer/dashboard`;

      await sendOrganizerApprovalEmail(
        application.email,
        application.name,
        dashboardUrl
      );
      console.log(`Approval email sent to ${application.email}`);
    } catch (emailError: any) {
      // Log email error but don't fail the approval
      console.error('Failed to send approval email:', emailError);
    }

    // Restore user token
    if (userToken) {
      pb.authStore.save(userToken, null);
    }

    res.json({ organizer, application });
  } catch (error: any) {
    // Restore user token on error
    const pb = getPocketBase();
    const userToken = pb.authStore.token;
    // Try to restore if we have a saved token
    // Note: We can't reliably restore here, but the middleware will handle re-auth
    next(error);
  }
});

// Get organizer applications (Admin/Super Admin)
router.get('/organizers/applications', requireAdmin, async (req, res, next) => {
  try {
    // The requireAdmin middleware overwrites admin auth with user auth
    // We need to restore admin auth to bypass access rules
    const pb = getPocketBase();

    // Save the current user token (we'll restore it if needed)
    const userToken = pb.authStore.token;

    // Re-authenticate as admin to bypass access rules
    const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
    const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      return res.status(500).json({ error: 'Admin credentials not configured' });
    }

    // Authenticate as admin
    await pb.admins.authWithPassword(adminEmail, adminPassword);

    const { status = 'pending' } = req.query;

    const queryOptions: any = {
      sort: '-created',
    };

    // Only add filter if status is not 'all'
    if (status && status !== 'all') {
      queryOptions.filter = `status="${status}"`;
    }

    // Use admin API to bypass access rules
    let applications: any[];
    try {
      applications = await pb.collection('organizer_applications').getFullList(queryOptions);
    } catch (error: any) {
      // Handle autocancellation errors gracefully
      if (error?.isAbort || error?.message?.includes('autocancelled')) {
        console.warn('[Applications API] Request was autocancelled, retrying...');
        // Retry once
        applications = await pb.collection('organizer_applications').getFullList(queryOptions);
      } else {
        throw error;
      }
    }

    console.log(`[Applications API] Requested status: ${status}`);
    console.log(`[Applications API] Found ${applications.length} applications`);
    if (applications.length > 0) {
      console.log('[Applications API] Application details:', applications.map((app: any) => ({
        id: app.id,
        name: app.name,
        status: app.status,
        email: app.email,
        created: app.created
      })));
    }

    // Restore user token if it existed (for other operations)
    if (userToken) {
      pb.authStore.save(userToken, null);
    }

    res.json(applications);
  } catch (error: any) {
    console.error('Error fetching applications:', error);
    next(error);
  }
});

// Get all organizers (Admin/Super Admin)
router.get('/organizers', requireAdmin, async (req, res, next) => {
  try {
    // Restore admin auth to bypass access rules
    const pb = getPocketBase();
    const userToken = pb.authStore.token;

    const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
    const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      return res.status(500).json({ error: 'Admin credentials not configured' });
    }

    await pb.admins.authWithPassword(adminEmail, adminPassword);

    const { status } = req.query;

    const queryOptions: any = {
      sort: '-created',
    };

    if (status && status !== 'all') {
      queryOptions.filter = `status="${status}"`;
    }

    const organizers = await pb.collection('organizers').getFullList(queryOptions);

    console.log(`[Organizers API] Requested status: ${status}`);
    console.log(`[Organizers API] Found ${organizers.length} organizers`);
    if (organizers.length > 0) {
      console.log('[Organizers API] Organizers:', organizers.map((org: any) => ({
        id: org.id,
        name: org.name,
        status: org.status,
        email: org.email
      })));
    } else {
      // Check total organizers in DB
      const allOrgs = await pb.collection('organizers').getFullList({ sort: '-created' });
      console.log(`[Organizers API] Total organizers in DB: ${allOrgs.length}`);
      if (allOrgs.length > 0) {
        console.log('[Organizers API] All organizers:', allOrgs.map((org: any) => ({
          id: org.id,
          name: org.name,
          status: org.status || 'null/undefined'
        })));
      }
    }

    if (userToken) {
      pb.authStore.save(userToken, null);
    }

    res.json(organizers);
  } catch (error: any) {
    console.error('Error fetching organizers:', error);
    next(error);
  }
});

// Get single organizer by ID (Admin/Super Admin)
router.get('/organizers/:id', requireAdmin, async (req, res, next) => {
  try {
    // Restore admin auth to bypass access rules
    const pb = getPocketBase();
    const userToken = pb.authStore.token;

    const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
    const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      return res.status(500).json({ error: 'Admin credentials not configured' });
    }

    await pb.admins.authWithPassword(adminEmail, adminPassword);

    const organizer = await pb.collection('organizers').getOne(req.params.id);

    // Also fetch related data
    try {
      const staff = await pb.collection('organizer_staff').getFullList({
        filter: `organizer_id="${req.params.id}"`,
        expand: 'user_id',
      });

      const events = await pb.collection('events').getFullList({
        filter: `organizer_id="${req.params.id}"`,
        sort: '-created',
        expand: 'venue_id',
      });

      if (userToken) {
        pb.authStore.save(userToken, null);
      }

      res.json({
        organizer,
        staff,
        events,
      });
    } catch (error: any) {
      // If related data fails, still return organizer
      if (userToken) {
        pb.authStore.save(userToken, null);
      }
      res.json({
        organizer,
        staff: [],
        events: [],
      });
    }
  } catch (error: any) {
    console.error('Error fetching organizer:', error);
    next(error);
  }
});

// Reject organizer application
router.post('/organizers/:applicationId/reject', requireAdmin, async (req, res, next) => {
  try {
    const pb = getPocketBase();
    const reviewedBy = (req as any).user.id;
    const { reviewNotes } = req.body;

    // Save user token
    const userToken = pb.authStore.token;

    // Authenticate as admin to bypass access rules
    const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
    const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      return res.status(500).json({ error: 'Admin credentials not configured' });
    }

    await pb.admins.authWithPassword(adminEmail, adminPassword);

    // Get application using admin auth
    const application = await pb.collection('organizer_applications').getOne(req.params.applicationId);

    if (application.status !== 'pending') {
      // Restore user token before returning
      if (userToken) {
        pb.authStore.save(userToken, null);
      }
      return res.status(400).json({ error: 'Application already processed' });
    }

    // Update application
    await pb.collection('organizer_applications').update(req.params.applicationId, {
      status: 'rejected',
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      review_notes: reviewNotes || 'Application rejected',
    });

    // Restore user token
    if (userToken) {
      pb.authStore.save(userToken, null);
    }

    res.json({ success: true, application });
  } catch (error: any) {
    next(error);
  }
});

// Force cancel event (Super Admin only)
router.post('/events/:eventId/cancel', requireSuperAdmin, async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ error: 'Reason is required' });
    }

    const { forceCancelEvent } = await import('../services/refundService');
    const result = await forceCancelEvent(req.params.eventId, (req as any).user.id, reason);
    res.json(result);
  } catch (error: any) {
    next(error);
  }
});

// Force refund order (Super Admin only)
router.post('/orders/:orderId/refund', requireSuperAdmin, async (req, res, next) => {
  try {
    const { reason, amount } = req.body;
    const { processRefund } = await import('../services/refundService');

    const result = await processRefund({
      orderId: req.params.orderId,
      refundedBy: (req as any).user.id,
      reason: reason || 'Force refund by Super Admin',
      amount: amount ? parseInt(amount) : undefined,
    });
    res.json(result);
  } catch (error: any) {
    next(error);
  }
});

// Get all events (Admin/Super Admin)
router.get('/events', requireAdmin, async (req, res, next) => {
  try {
    const pb = getPocketBase();
    const events = await pb.collection('events').getFullList({
      sort: '-created',
      expand: 'organizer_id,venue_id',
    });
    res.json(events);
  } catch (error: any) {
    next(error);
  }
});

// Get all orders (Admin/Super Admin)
router.get('/orders', requireAdmin, async (req, res, next) => {
  try {
    const pb = getPocketBase();
    const { eventId, status, limit = 50 } = req.query;
    let filter = '';
    if (eventId) filter += `event_id="${eventId}"`;
    if (status) filter += filter ? ` && status="${status}"` : `status="${status}"`;

    const queryOptions: any = {
      sort: '-created',
      expand: 'user_id,event_id',
    };

    // Only add filter if it's not empty
    if (filter) {
      queryOptions.filter = filter;
    }

    const orders = await pb.collection('orders').getList(1, parseInt(limit as string), queryOptions);
    res.json(orders);
  } catch (error: any) {
    next(error);
  }
});

// Confirm cash payment order (Admin/Super Admin)
router.post('/orders/:orderId/confirm-cash', requireAdmin, async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const pb = getPocketBase();

    // Save user token
    const userToken = pb.authStore.token;

    // Authenticate as admin to bypass access rules
    const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
    const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      return res.status(500).json({ error: 'Admin credentials not configured' });
    }

    try {
      await pb.admins.authWithPassword(adminEmail, adminPassword);

      // First check if order exists and is in pending status
      let order;
      try {
        order = await pb.collection('orders').getOne(orderId);
      } catch (error: any) {
        if (error.status === 404) {
          return res.status(404).json({ error: 'Order not found' });
        }
        throw error;
      }

      if (order.status !== 'pending') {
        return res.status(400).json({
          error: `Order is already ${order.status}. Cannot confirm cash payment.`
        });
      }

      // Check if tickets exist for this order
      const tickets = await pb.collection('tickets').getFullList({
        filter: `order_id="${orderId}"`,
      });

      if (tickets.length === 0) {
        return res.status(400).json({
          error: 'No tickets found for this order. Please ensure tickets were created when the order was created.'
        });
      }

      console.log(`[Cash Confirmation] Confirming order ${orderId} with ${tickets.length} tickets`);

      const { confirmOrder } = await import('../services/orderService');

      // Confirm order without payment ID/signature (cash payment)
      await confirmOrder(orderId);

      console.log(`[Cash Confirmation] Order ${orderId} confirmed successfully`);

      // Restore user token
      if (userToken) {
        pb.authStore.save(userToken, null);
      }

      res.json({ success: true, message: 'Cash payment confirmed successfully. Tickets issued and email sent.' });
    } catch (error) {
      // Restore user token on error
      if (userToken) {
        pb.authStore.save(userToken, null);
      }
      throw error;
    }
  } catch (error: any) {
    console.error(`[Cash Confirmation] Error confirming order ${req.params.orderId}:`, error);
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      data: error.data,
      stack: error.stack,
    });
    next(error);
  }
});

// Get all tickets (Admin/Super Admin)
router.get('/tickets', requireAdmin, async (req, res, next) => {
  try {
    const pb = getPocketBase();
    const { orderId, eventId, status, limit = 100 } = req.query;
    let filter = '';
    if (orderId) filter += `order_id="${orderId}"`;
    if (eventId) filter += filter ? ` && event_id="${eventId}"` : `event_id="${eventId}"`;
    if (status) filter += filter ? ` && status="${status}"` : `status="${status}"`;

    const queryOptions: any = {
      sort: '-created',
      expand: 'order_id.user_id,order_id,event_id,ticket_type_id,seat_id',
    };

    if (filter) {
      queryOptions.filter = filter;
    }

    const tickets = await pb.collection('tickets').getList(1, parseInt(limit as string), queryOptions);
    res.json(tickets);
  } catch (error: any) {
    next(error);
  }
});

// Middleware to allow admin or organizer staff
const requireAdminOrOrganizerStaff = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Invalid token format' });
    }

    const { createUserClient } = await import('../lib/pocketbase');
    const userClient = createUserClient(token);

    try {
      await userClient.collection('users').authRefresh();
    } catch (e: any) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const user = userClient.authStore.model;
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Allow admin/super_admin or users with backoffice_access
    const isAdmin = user.role === 'admin' || user.role === 'super_admin';
    const hasBackofficeAccess = user.backoffice_access === true;

    if (!isAdmin && !hasBackofficeAccess) {
      return res.status(403).json({ error: 'Requires Admin role or backoffice access' });
    }

    (req as any).user = user;
    next();
  } catch (error) {
    console.error('Auth check failed:', error);
    res.status(500).json({ error: 'Auth check failed' });
  }
};

// Check-in ticket (Admin/Super Admin or Organizer Staff)
router.post('/tickets/:ticketId/checkin', requireAdminOrOrganizerStaff, async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const checkedInBy = (req as any).user.id;
    const pb = getPocketBase();

    const ticket = await pb.collection('tickets').getOne(ticketId, {
      expand: 'event_id',
    });

    // If not admin/super_admin, verify user is organizer staff for this event
    const user = (req as any).user;
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      const event = ticket.expand?.event_id || await pb.collection('events').getOne(ticket.event_id);
      try {
        await pb.collection('organizer_staff').getFirstListItem(
          `user_id="${user.id}" && organizer_id="${event.organizer_id}" && status="active"`
        );
      } catch (e) {
        return res.status(403).json({ error: 'You do not have permission to check in tickets for this event' });
      }
    }

    if (ticket.status !== 'issued') {
      return res.status(400).json({
        error: `Ticket is ${ticket.status}, cannot check in. Only issued tickets can be checked in.`
      });
    }

    await pb.collection('tickets').update(ticketId, {
      status: 'checked_in',
      checked_in_at: new Date().toISOString(),
      checked_in_by: checkedInBy,
    });

    res.json({ success: true, message: 'Ticket checked in successfully' });
  } catch (error: any) {
    next(error);
  }
});

// Cancel ticket (Admin/Super Admin only)
router.post('/tickets/:ticketId/cancel', requireAdmin, async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const { reason } = req.body;
    const pb = getPocketBase();

    const ticket = await pb.collection('tickets').getOne(ticketId);

    if (ticket.status === 'checked_in') {
      return res.status(400).json({
        error: 'Cannot cancel a ticket that has already been checked in'
      });
    }

    if (ticket.status === 'cancelled') {
      return res.status(400).json({
        error: 'Ticket is already cancelled'
      });
    }

    await pb.collection('tickets').update(ticketId, {
      status: 'cancelled',
    });

    // If ticket was issued, we might want to refund or restore inventory
    // For now, just mark as cancelled
    // TODO: Handle refund logic if needed

    res.json({ success: true, message: 'Ticket cancelled successfully' });
  } catch (error: any) {
    next(error);
  }
});

// Get platform stats (Admin/Super Admin)
router.get('/stats', requireAdmin, async (req, res, next) => {
  try {
    const pb = getPocketBase();

    const [events, orders, organizers, users] = await Promise.all([
      pb.collection('events').getFullList(),
      pb.collection('orders').getFullList({ filter: 'status="paid"' }),
      pb.collection('organizers').getFullList({ filter: 'status="approved"' }),
      pb.collection('users').getFullList(),
    ]);

    const totalRevenue = orders.reduce((sum, order) => sum + order.total_amount_minor, 0);
    const totalRefunds = orders.reduce((sum, order) => sum + (order.refunded_amount_minor || 0), 0);

    res.json({
      events: {
        total: events.length,
        published: events.filter((e: any) => e.status === 'published').length,
        cancelled: events.filter((e: any) => e.status === 'cancelled').length,
      },
      orders: {
        total: orders.length,
        totalRevenue,
        totalRefunds,
        netRevenue: totalRevenue - totalRefunds,
      },
      organizers: {
        total: organizers.length,
      },
      users: {
        total: users.length,
      },
    });
  } catch (error: any) {
    next(error);
  }
});

// User management routes (Super Admin only)
router.get('/users', requireSuperAdmin, async (req, res, next) => {
  try {
    const pb = getPocketBase();
    const { role, limit = 100 } = req.query;
    let filter = '';
    if (role) filter = `role="${role}"`;

    const queryOptions: any = {
      sort: '-created',
    };

    // Only add filter if it's not empty
    if (filter) {
      queryOptions.filter = filter;
    }

    const users = await pb.collection('users').getList(1, parseInt(limit as string), queryOptions);
    res.json(users);
  } catch (error: any) {
    next(error);
  }
});

// Create user (Super Admin only)
router.post('/users', requireSuperAdmin, async (req, res, next) => {
  try {
    const { email, password, name, role, backoffice_access, can_manage_roles } = req.body;

    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'Email, password, name, and role are required' });
    }

    const validRoles = ['customer', 'admin', 'super_admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Role must be one of: ${validRoles.join(', ')}` });
    }

    const pb = getPocketBase();

    // Create user via PocketBase auth
    const userData: any = {
      email,
      password,
      passwordConfirm: password,
      name,
      role,
      emailVisibility: true,
    };

    // Add backoffice fields if provided
    if (backoffice_access !== undefined) {
      userData.backoffice_access = backoffice_access;
      if (backoffice_access) {
        // Track when access was granted
        userData.backoffice_access_granted_at = new Date().toISOString();
        userData.backoffice_access_granted_by = (req as any).user.id;
      }
    }
    if (can_manage_roles !== undefined) {
      userData.can_manage_roles = can_manage_roles;
    }

    const createdUser = await pb.collection('users').create(userData);

    res.json({ success: true, user: createdUser });
  } catch (error: any) {
    if (error.status === 400 && error.data?.email) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    next(error);
  }
});

// Update user role (Super Admin only)
router.patch('/users/:userId/role', requireSuperAdmin, async (req, res, next) => {
  try {
    const { role } = req.body;
    const { userId } = req.params;

    if (!role) {
      return res.status(400).json({ error: 'Role is required' });
    }

    const validRoles = ['customer', 'admin', 'super_admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Role must be one of: ${validRoles.join(', ')}` });
    }

    const pb = getPocketBase();

    // Prevent changing own role
    if (userId === (req as any).user.id && role !== 'super_admin') {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    const user = await pb.collection('users').update(userId, {
      role,
    });

    res.json({ success: true, user });
  } catch (error: any) {
    next(error);
  }
});

// Block/Unblock user (Super Admin only)
router.patch('/users/:userId/block', requireSuperAdmin, async (req, res, next) => {
  try {
    const { blocked } = req.body;
    const { userId } = req.params;

    if (typeof blocked !== 'boolean') {
      return res.status(400).json({ error: 'blocked must be a boolean' });
    }

    const pb = getPocketBase();

    // Prevent blocking yourself
    if (userId === (req as any).user.id && blocked) {
      return res.status(400).json({ error: 'Cannot block yourself' });
    }

    const user = await pb.collection('users').update(userId, {
      blocked,
    });

    res.json({ success: true, user });
  } catch (error: any) {
    next(error);
  }
});

// Update backoffice access (Super Admin or users with can_manage_roles only)
router.patch('/users/:userId/backoffice', requireSuperAdmin, async (req, res, next) => {
  try {
    const { backoffice_access, can_manage_roles, notes } = req.body;
    const { userId } = req.params;
    const grantedBy = (req as any).user.id;

    const pb = getPocketBase();

    // Get current user state
    const currentUser = await pb.collection('users').getOne(userId);
    const updateData: any = {};

    if (typeof backoffice_access === 'boolean') {
      updateData.backoffice_access = backoffice_access;

      // Track access changes
      if (backoffice_access && !currentUser.backoffice_access) {
        // Granting access
        updateData.backoffice_access_granted_at = new Date().toISOString();
        updateData.backoffice_access_granted_by = grantedBy;
        updateData.backoffice_access_revoked_at = null;
        updateData.backoffice_access_revoked_by = null;
      } else if (!backoffice_access && currentUser.backoffice_access) {
        // Revoking access
        updateData.backoffice_access_revoked_at = new Date().toISOString();
        updateData.backoffice_access_revoked_by = grantedBy;
        updateData.can_manage_roles = false; // Also remove role management
      }
    }

    if (typeof can_manage_roles === 'boolean') {
      // Can only grant role management if backoffice access exists
      if (can_manage_roles) {
        const user = await pb.collection('users').getOne(userId);
        if (!user.backoffice_access) {
          return res.status(400).json({ error: 'User must have backoffice access to manage roles' });
        }
      }
      updateData.can_manage_roles = can_manage_roles;
    }

    // Add notes if provided
    if (notes !== undefined) {
      updateData.backoffice_access_notes = notes;
    }

    const user = await pb.collection('users').update(userId, updateData);

    res.json({ success: true, user });
  } catch (error: any) {
    next(error);
  }
});

export default router;
