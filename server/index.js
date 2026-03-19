const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const supabase = require('./lib/supabase');

dotenv.config({ quiet: true });

const app = express();
const PORT = process.env.PORT || 4000;

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const wildcardCors = allowedOrigins.includes('*');

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (wildcardCors || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
  credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Basic health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Root route for platform probes and manual checks.
app.get('/', (req, res) => {
  res.json({
    service: 'niyoplan-api',
    status: 'ok',
    endpoints: ['/health', '/health/deps']
  });
});

// Deployment diagnostics endpoint (safe: no secrets are returned)
app.get('/health/deps', async (req, res) => {
  const envStatus = {
    SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
    SUPABASE_SERVICE_KEY: Boolean(process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY),
    GROQ_API_KEY: Boolean(process.env.GROQ_API_KEY)
  };

  try {
    const { error } = await supabase
      .from('projects')
      .select('*', { head: true, count: 'exact' })
      .limit(1);

    if (error) {
      return res.status(500).json({
        status: 'error',
        env: envStatus,
        database: { ok: false, code: error.code || null, message: error.message }
      });
    }

    return res.json({
      status: 'ok',
      env: envStatus,
      database: { ok: true }
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      env: envStatus,
      database: { ok: false, message: err.message }
    });
  }
});

// Import routes
const authRoutes = require('./routes/auth.routes');
const projectRoutes = require('./routes/project.routes');
const adminRoutes = require('./routes/admin.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const ticketRoutes = require('./routes/card.routes.js');
const listRoutes = require('./routes/list.routes.js');
const sprintRoutes = require('./routes/sprint.routes.js');
const dependencyRoutes = require('./routes/dependency.routes.js');
const dsmRoutes = require('./routes/dsm.routes.js');
const meetingRoutes = require('./routes/meeting.routes.js');
const goalsRoutes = require('./routes/goals.routes.js');
const workspaceRoutes = require('./routes/workspace.routes.js');
const aiRoutes = require('./routes/ai.routes.js');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects', ticketRoutes);
app.use('/api/projects', listRoutes);
app.use('/api/projects', sprintRoutes);
app.use('/api/projects', dependencyRoutes);
app.use('/api/projects', dsmRoutes);
app.use('/api/projects', meetingRoutes);
app.use('/api/projects', goalsRoutes);
app.use('/api/projects', workspaceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ai', aiRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS origin denied' });
  }
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!', details: err.message });
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
