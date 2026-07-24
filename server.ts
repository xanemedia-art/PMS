import express from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

import authRoutes from './src/api/routes/auth.routes.js';
import bookingsRoutes from './src/api/routes/bookings.routes.js';
import roomsRoutes from './src/api/routes/rooms.routes.js';
import housekeepingRoutes from './src/api/routes/housekeeping.routes.js';
import reportsRoutes from './src/api/routes/reports.routes.js';
import agentsRoutes from './src/api/routes/agents.routes.js';
import plansRoutes from './src/api/routes/plans.routes.js';
import expensesRoutes from './src/api/routes/expenses.routes.js';
import settingsRoutes from './src/api/routes/settings.routes.js';
import publicRoutes from './src/api/routes/public.routes.js';
import guestRoutes from './src/api/routes/guest.routes.js';
import restaurantRoutes from './src/api/routes/restaurant.routes.js';
import superAdminRoutes from './src/api/routes/super-admin.routes.js';
import subscriptionRoutes from './src/api/routes/subscription.routes.js';
import billingRoutes from './src/api/routes/billing.routes.js';
import notificationsRoutes from './src/api/routes/notifications.routes.js';
import { checkSubscription } from './src/api/middleware/subscription.middleware.js';


import multer from 'multer';
import fs from 'fs';

dotenv.config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure uploads directory exists (Skip or try-catch for serverless environments like Vercel)
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (process.env.VERCEL !== '1') {
  try {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  } catch (err) {
    console.warn('Could not create uploads directory:', err);
  }
}

// Multer config (Use memoryStorage to support both local disk and serverless read-only environments)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 } // 8MB max file size
});

export async function createApp() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use('/uploads', express.static(uploadDir));
  app.use(checkSubscription);

  // File Upload API (Supports local disk + Vercel / serverless EROFS fallback)
  app.post('/api/upload', (req, res) => {
    upload.any()(req, res, (err) => {
      if (err) {
        console.error('Upload error:', err);
        return res.status(400).json({ error: err.message || 'File upload failed' });
      }

      const file = req.file || (req.files && (req.files as Express.Multer.File[])[0]);
      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = file.originalname ? path.extname(file.originalname) : '.jpg';
      const filename = `${uniqueSuffix}${ext}`;

      // 1. Attempt writing to local disk
      try {
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        const filePath = path.join(uploadDir, filename);
        fs.writeFileSync(filePath, file.buffer);

        const fileUrl = `/uploads/${filename}`;
        return res.json({ url: fileUrl });
      } catch (diskErr: any) {
        // 2. Read-Only File System Fallback (Vercel / AWS Lambda / Serverless)
        console.warn('Read-only environment detected (Vercel/Serverless). Using Base64 Data URL fallback:', diskErr?.message);
        
        const mimeType = file.mimetype || 'image/jpeg';
        const base64Data = file.buffer.toString('base64');
        const dataUrl = `data:${mimeType};base64,${base64Data}`;

        return res.json({ url: dataUrl });
      }
    });
  });

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Xane PMS API is running' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/subscription', subscriptionRoutes);

  // Apply subscription check middleware for all PMS routes
  app.use(checkSubscription);

  app.use('/api/bookings', bookingsRoutes);
  app.use('/api/rooms', roomsRoutes);
  app.use('/api/housekeeping', housekeepingRoutes);
  app.use('/api/reports', reportsRoutes);
  app.use('/api/agents', agentsRoutes);
  app.use('/api/plans', plansRoutes);
  app.use('/api/expenses', expensesRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/public', publicRoutes);
  app.use('/api/guest', guestRoutes);
  app.use('/api/restaurant', restaurantRoutes);
  app.use('/api/super-admin', superAdminRoutes);
  app.use('/api/billing', billingRoutes);
  app.use('/api/notifications', notificationsRoutes);


  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production' && process.env.VERCEL !== '1') {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      console.log('Vite middleware loaded');
    } catch (e) {
      console.log('Vite not found, skipping middleware (likely production)');
    }
  } else if (process.env.NODE_ENV === 'production' && process.env.VERCEL !== '1') {
    // Production setup for standard Node servers (Render, etc)
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return app;
}

// For local development
if (process.env.VERCEL !== '1') {
  createApp().then(app => {
    const PORT = Number(process.env.PORT || 3000);
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }).catch(err => {
    console.error('Failed to start server:', err);
  });
}
