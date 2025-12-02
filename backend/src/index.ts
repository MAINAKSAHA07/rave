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

// Load .env from root directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
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

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Handle autocancellation errors gracefully
  if ((err as any)?.isAbort || err.message?.includes('autocancelled')) {
    console.warn('Request autocancelled, returning 409 Conflict:', err.message);
    return res.status(409).json({ 
      error: 'Request conflict', 
      message: 'The request was cancelled due to a duplicate request. Please try again.' 
    });
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

