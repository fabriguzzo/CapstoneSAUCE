/**
 * Name: index.ts
 * Date: 2026-02-09
 * Author: CapstoneSAUCE Team
 * Synopsis: Server entry point
 * Variables: PORT - server port number
 */

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

// Import routes
import teamsRouter from './routes/teams';
import playersRouter from './routes/players';
import gamesRouter from './routes/games';

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/capstone-sauce';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// CORS configuration
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));

// Handle preflight requests for all routes
app.options('*', cors(corsOptions));

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'CapstoneSAUCE API Server' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.post('/api/feedback', (req, res) => {
  const { email, subject, message, timestamp } = req.body;
  
  if (!email || !subject || !message) {
    return res.status(400).json({ error: 'Email, subject, and message are required' });
  }

  const feedbackEntry = `
--- Feedback Entry ---
Date: ${timestamp || new Date().toISOString()}
Email: ${email}
Subject: ${subject}
Message: ${message}
----------------------

`;

  const feedbackFilePath = path.join(__dirname, '..', 'feedback.txt');

  fs.appendFile(feedbackFilePath, feedbackEntry, (err) => {
    if (err) {
      console.error('Error writing feedback:', err);
      return res.status(500).json({ error: 'Failed to save feedback' });
    }
    res.status(200).json({ message: 'Feedback saved successfully' });
  });
});

// Handle OPTIONS preflight for /api/feedback specifically
app.options('/api/feedback', cors(corsOptions), (req, res) => {
  res.sendStatus(200);
});

// API Routes
app.use('/api/teams', teamsRouter);
app.use('/api/players', playersRouter);
app.use('/api/games', gamesRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
