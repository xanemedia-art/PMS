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


import multer from 'multer';
import fs from 'fs';

dotenv.config();

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

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

export async function createApp() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use('/uploads', express.static(uploadDir));

  // File Upload API
  app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
  });

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Xane PMS API is running' });
  });

  app.use('/api/auth', authRoutes);
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
