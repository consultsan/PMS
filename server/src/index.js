const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');

// Import routes
const authRoutes = require('./routes/auth');
const hospitalRoutes = require('./routes/hospitals');
const userRoutes = require('./routes/users');
const leadRoutes = require('./routes/leads');
const pointsApprovalRoutes = require('./routes/pointsApproval');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/users', userRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/points-approval', pointsApprovalRoutes);

// Basic route for testing
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to TRUE Partner Management System API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 