require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const gameController = require('./controller/gameController');
const playerController = require('./controller/playerController');
const teamController = require('./controller/teamController');
const feedbackDao = require('./model/feedbackDao');
const statTrackerController = require('./controller/statTrackerController');

const app = express();
const PORT = process.env.PORT || 5001;

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/capstone-sauce';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

const corsOptions = {
  origin: ['http://localhost:3001', 'http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:3001', 'http://127.0.0.1:5173', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'CapstoneSAUCE API Server' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.post('/api/feedback', async (req, res) => {
  const { email, subject, message, timestamp } = req.body;
  
  if (!email || !subject || !message) {
    return res.status(400).json({ error: 'Email, subject, and message are required' });
  }

  try {
    const feedbackData = {
      email,
      subject,
      message,
      timestamp: timestamp || new Date()
    };
    
    await feedbackDao.create(feedbackData);
    res.status(200).json({ message: 'Feedback saved successfully' });
  } catch (err) {
    console.error('Error saving feedback:', err);
    res.status(500).json({ error: 'Failed to save feedback' });
  }
});

app.options('/api/feedback', cors(corsOptions), (req, res) => {
  res.sendStatus(200);
});

const teamsRouter = express.Router();
teamsRouter.get('/', teamController.getAll);
teamsRouter.get('/:id', teamController.getOne);
teamsRouter.post('/', teamController.create);
teamsRouter.put('/:id', teamController.update);
teamsRouter.delete('/:id', teamController.deleteOne);
teamsRouter.delete('/', teamController.deleteAll);
app.use('/api/teams', teamsRouter);

const playersRouter = express.Router();
playersRouter.get('/', playerController.getAll);
playersRouter.get('/:id', playerController.getOne);
playersRouter.post('/', playerController.create);
playersRouter.put('/:id', playerController.update);
playersRouter.delete('/:id', playerController.deleteOne);
playersRouter.delete('/', playerController.deleteAll);
app.use('/api/players', playersRouter);

const gamesRouter = express.Router();
gamesRouter.get('/', gameController.getAll);
gamesRouter.get('/:id', gameController.getOne);
gamesRouter.post('/', gameController.create);
gamesRouter.put('/:id/score', gameController.updateScore);
gamesRouter.put('/:id/finish', gameController.finishGame);
gamesRouter.put('/:id', gameController.updateGameInfo);
gamesRouter.delete('/:id', gameController.deleteOne);
gamesRouter.delete('/', gameController.deleteAll);
app.use('/api/games', gamesRouter);

const statsRouter = express.Router();
statsRouter.get('/', statTrackerController.getAll);          // GET /api/stats?teamId=&gameId=
statsRouter.get('/:id', statTrackerController.getOne);       // GET /api/stats/:id
statsRouter.post('/', statTrackerController.create);         // POST /api/stats
statsRouter.put('/:id', statTrackerController.update);       // PUT /api/stats/:id
statsRouter.delete('/:id', statTrackerController.deleteOne); // DELETE /api/stats/:id
statsRouter.delete('/', statTrackerController.deleteAll);    // DELETE /api/stats?teamId=&gameId=
statsRouter.post('/bulk', statTrackerController.bulkSave);   // POST /api/stats/bulk   ✅ used by your UI

app.use('/api/stats', statsRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
