require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const gameController = require('./controller/gameController');
const playerController = require('./controller/playerController');
const teamController = require('./controller/teamController');
const feedbackController = require('./controller/feedbackController');
const statTrackerController = require('./controller/statTrackerController');
const statRoleController = require("./controller/statRoleController");

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

app.post('/api/feedback', feedbackController.create);

app.options('/api/feedback', cors(corsOptions), (req, res) => {
  res.sendStatus(200);
});

app.get('/api/feedback', feedbackController.getAll);

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
statsRouter.get('/history', statTrackerController.getHistory); // GET /api/stats/history?gameId=&playerId=
statsRouter.get('/history/game/:gameId', statTrackerController.getGameHistory); // GET /api/stats/history/game/:gameId
statsRouter.get('/history/player', statTrackerController.getPlayerHistory); // GET /api/stats/history/player?gameId=&playerId=
statsRouter.get('/', statTrackerController.getAll);          
statsRouter.get('/:id', statTrackerController.getOne);      
statsRouter.post('/', statTrackerController.create);         
statsRouter.put('/:id', statTrackerController.update);       
statsRouter.delete('/:id', statTrackerController.deleteOne); 
statsRouter.delete('/', statTrackerController.deleteAll);    
statsRouter.post('/bulk', statTrackerController.bulkSave);   
app.use('/api/stats', statsRouter);

const rolesRouter = express.Router();
rolesRouter.get("/", statRoleController.getAll);
rolesRouter.post("/bulk", statRoleController.bulkSave);
app.use("/api/stat-roles", rolesRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
