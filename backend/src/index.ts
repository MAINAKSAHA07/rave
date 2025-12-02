import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { initializePocketBase } from './lib/pocketbase';
import { initializeScheduledJobs } from './jobs/scheduler';
import orderRoutes from './routes/orders';
import paymentRoutes from './routes/payments';
import refundRoutes from './routes/refunds';
import checkinRoutes from './routes/checkin';
import adminRoutes from './routes/admin';
import ticketRoutes from './routes/tickets';
import testEmailRoutes from './routes/test-email';
import emailTemplateRoutes from './routes/email-templates';
import seatRoutes from './routes/seats';
import seatReservationRoutes from './routes/seat-reservations';

// Load .env from root directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
// CORS configuration - support both local and AWS environments
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Get allowed origins from environment or use defaults
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : [
        'http://localhost:3000',
        'http://localhost:3002',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3002',
      ];

    // Add AWS server IP if provided
    if (process.env.SERVER_IP) {
      allowedOrigins.push(`http://${process.env.SERVER_IP}:3000`);
      allowedOrigins.push(`http://${process.env.SERVER_IP}:3002`);
    }

    // Add custom frontend/backoffice URLs if provided
    if (process.env.FRONTEND_URL) {
      allowedOrigins.push(process.env.FRONTEND_URL);
    }
    if (process.env.BACKOFFICE_URL) {
      allowedOrigins.push(process.env.BACKOFFICE_URL);
    }

    // Allow Netlify domains (for production deployments)
    if (origin && (origin.includes('.netlify.app') || origin.includes('.netlify.com'))) {
      return callback(null, true);
    }

    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/refunds', refundRoutes);
app.use('/api/checkin', checkinRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/test-email', testEmailRoutes);
app.use('/api/email-templates', emailTemplateRoutes);
app.use('/api/seats', seatRoutes);
app.use('/api/seat-reservations', seatReservationRoutes);

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // Handle autocancellation errors gracefully
  if ((err as any)?.isAbort || err.message?.includes('autocancelled')) {
    console.warn('Request autocancelled, returning 409 Conflict:', err.message);
    res.status(409).json({
      error: 'Request conflict',
      message: 'The request was cancelled due to a duplicate request. Please try again.'
    });
    return;
  }

  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Initialize services
async function start() {
  try {
    await initializePocketBase();
    console.log('✓ PocketBase initialized');

    initializeScheduledJobs();
    console.log('✓ Scheduled jobs initialized');

    app.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();



