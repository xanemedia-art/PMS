import express from 'express';
import { createServer as createViteServer } from 'vite';
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

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function createApp() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

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

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production' && process.env.VERCEL !== '1') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (process.env.NODE_ENV === 'production') {
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
if (process.env.VERCEL !== '1' && (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('server.ts'))) {
  createApp().then(app => {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  });
}
