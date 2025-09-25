import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current directory first
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables FIRST
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

// Import basic middleware (these don't depend on env vars)
import { errorHandler } from './middleware/errorHandler.js';

// Routes and other modules will be imported dynamically after env loading

// Directory already defined above for dotenv

// Import logger after env is loaded
const { logger } = await import('./utils/logger.js');
const { prisma } = await import('./utils/database.js');

// Initialize scalability and data isolation services
const { initializeScalability } = await import('./services/scalabilityService.js');
const { initializeDataIsolation } = await import('./services/dataIsolationService.js');

initializeScalability();
initializeDataIsolation();

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for nginx reverse proxy (specific to avoid rate-limit error)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // Disable CSP for API
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Log the origin for debugging
    logger.info(`CORS request from origin: ${origin || 'no-origin'}`);
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In development, allow localhost on any port
    if (process.env.NODE_ENV === 'development') {
      const allowedOrigins = [
        'http://localhost:5173',
        'http://localhost:3000', 
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000',
        process.env.CORS_ORIGIN
      ].filter(Boolean);
      
      // Check if origin starts with localhost
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
      
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
    } else {
      // In production, use strict origin checking
      if (origin === process.env.CORS_ORIGIN) {
        return callback(null, true);
      }
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: 1, // Trust first proxy (nginx)
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  }));
}

// Static files
app.use('/uploads', express.static(join(__dirname, '../uploads')));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: 'Database connection failed',
      timestamp: new Date().toISOString(),
    });
  }
});

// Test route
app.get('/public/test', (req, res) => {
  res.json({ success: true, message: 'Public route working' });
});

// Public landing page route (outside /api to avoid any middleware)
const { getPublicLandingPage } = await import('./controllers/landingPageController.js');
app.get('/public/lp/:slug', getPublicLandingPage);

// API routes - import dynamically after env is loaded
const apiRouter = express.Router();

// Import all routes dynamically
const [
  authRoutes,
  securityRoutes,
  userRoutes,
  campaignRoutes,
  leadRoutes,
  landingPageRoutes,
  landingPageCustomizationRoutes,
  aiRoutes,
  aiChatRoutes,
  onboardingRoutes,
  adminRoutes,
  analyticsRoutes,
  metricsRoutes,
  clientDashboardRoutes,
  creativeRoutes,
  approvalRoutes
] = await Promise.all([
  import('./routes/auth.js').then(m => m.default),
  import('./routes/security.js').then(m => m.default),
  import('./routes/users.js').then(m => m.default),
  import('./routes/campaigns.js').then(m => m.default),
  import('./routes/leads.js').then(m => m.default),
  import('./routes/landingPages.js').then(m => m.default),
  import('./routes/landingPageCustomization.js').then(m => m.default),
  import('./routes/ai.js').then(m => m.default),
  import('./routes/aiChat.js').then(m => m.default),
  import('./routes/onboarding.js').then(m => m.default),
  import('./routes/admin.js').then(m => m.default),
  import('./routes/analytics.js').then(m => m.default),
  import('./routes/metrics.js').then(m => m.default),
  import('./routes/clientDashboard.js').then(m => m.default),
  import('./routes/creatives.js').then(m => m.default),
  import('./routes/approvals.js').then(m => m.default),
]);

apiRouter.use('/auth', authRoutes);
apiRouter.use('/security', securityRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/campaigns', campaignRoutes);
apiRouter.use('/creatives', creativeRoutes);
apiRouter.use('/approvals', approvalRoutes);
apiRouter.use('/leads', leadRoutes);
apiRouter.use('/landing-pages', landingPageRoutes);
apiRouter.use('/landing-pages', landingPageCustomizationRoutes);
apiRouter.use('/ai', aiRoutes);
apiRouter.use('/chat', aiChatRoutes);
apiRouter.use('/onboarding', onboardingRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/analytics', analyticsRoutes);
apiRouter.use('/metrics', metricsRoutes);
apiRouter.use('/client-dashboard', clientDashboardRoutes);

app.use('/api', apiRouter);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl,
  });
});

// Global error handler
app.use(errorHandler);

// Start server with extended timeout for AI operations
const server = app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 API URL: http://localhost:${PORT}/api`);
  logger.info(`❤️ Health Check: http://localhost:${PORT}/health`);
});

// Set server timeout to 5 minutes for AI operations
server.timeout = 300000; // 5 minutes in milliseconds
server.keepAliveTimeout = 61000; // 61 seconds
server.headersTimeout = 65000; // 65 seconds

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');

  // Close server
  server.close(() => {
    logger.info('HTTP server closed');
  });

  // Close database connections
  await prisma.$disconnect();

  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');

  // Close server
  server.close(() => {
    logger.info('HTTP server closed');
  });

  // Close database connections
  await prisma.$disconnect();

  process.exit(0);
});

export default app;