const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

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
