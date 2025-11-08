/**
 * Express API Server
 * Production-ready REST API with authentication, payments, and webhooks
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import paymentRoutes from './routes/payments.js';
import webhookRoutes from './routes/webhooks.js';
import authRoutes from './routes/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { rateLimit } from './middleware/rateLimit.js';

// Load environment variables
dotenv.config();

const app: express.Express = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));

// Rate limiting (global)
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
}));

// Body parsing (except for webhooks which use raw body)
app.use((req, res, next) => {
  if (req.path === '/api/webhooks/zendfi') {
    next(); // Skip body parsing for webhooks
  } else {
    express.json()(req, res, next);
  }
});
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'ZendFi Express API',
    version: '1.0.0',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/profile (protected)',
        apiKeys: {
          create: 'POST /api/auth/api-keys (protected)',
          list: 'GET /api/auth/api-keys (protected)',
          revoke: 'DELETE /api/auth/api-keys/:id (protected)',
        },
      },
      payments: {
        create: 'POST /api/payments/create (requires API key)',
        get: 'GET /api/payments/:id',
        list: 'GET /api/payments',
      },
      webhooks: {
        zendfi: 'POST /api/webhooks/zendfi',
      },
    },
    documentation: 'https://docs.zendfi.com',
  });
});

// Routes
app.use('/api/auth', authRoutes as express.Router);
app.use('/api/payments', paymentRoutes as express.Router);
app.use('/api/webhooks', webhookRoutes as express.Router);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
  });
});

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log('🚀 Express API Server Started');
  console.log(`   URL: http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   ZendFi Mode: ${process.env.ZENDFI_ENVIRONMENT || 'development'}`);
  console.log('\n📚 Endpoints:');
  console.log(`   POST   /api/auth/register`);
  console.log(`   POST   /api/auth/login`);
  console.log(`   GET    /api/auth/profile`);
  console.log(`   POST   /api/payments/create`);
  console.log(`   GET    /api/payments/:id`);
  console.log(`   POST   /api/webhooks/zendfi`);
  console.log(`\n💡 API Info: http://localhost:${PORT}/api`);
});

export default app;
