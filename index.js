require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const passport = require('./middleware/passport');

const gameController = require('./controller/gameController');
const playerController = require('./controller/playerController');
const teamController = require('./controller/teamController');
const feedbackController = require('./controller/feedbackController');
const statTrackerController = require('./controller/statTrackerController');
const statRoleController = require("./controller/statRoleController");
const faceoffController = require('./controller/faceoffController');
const hitPenaltyController = require('./controller/hitPenaltyController');
const notificationController = require('./controller/notificationController');
const authController = require('./controller/authController');
const userController = require('./controller/userController');
const { authenticate, requireRole, requireApproved } = require('./middleware/auth');
const upload = require('./middleware/upload');

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
app.use(passport.initialize());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

// --- Auth routes (public) ---
const authRouter = express.Router();
authRouter.post('/register', authController.register);
authRouter.post('/login', authController.login);
authRouter.get('/me', authenticate, authController.getMe);
authRouter.post('/forgot-password', authController.forgotPassword);
authRouter.post('/reset-password', authController.resetPassword);
app.use('/api/auth', authRouter);

// --- User routes (protected) ---
const usersRouter = express.Router();
usersRouter.get('/profile', authenticate, userController.getProfile);
usersRouter.put('/profile', authenticate, upload.single('profilePicture'), userController.updateProfile);
usersRouter.get('/team/pending', authenticate, requireRole('coach'), userController.getPendingMembers);
usersRouter.get('/team/members', authenticate, requireRole('coach'), userController.getTeamMembers);
usersRouter.put('/:userId/approve', authenticate, requireRole('coach'), userController.approveMember);
usersRouter.put('/:userId/reject', authenticate, requireRole('coach'), userController.rejectMember);
usersRouter.delete('/:userId/remove', authenticate, requireRole('coach'), userController.removeMember);
app.use('/api/users', usersRouter);

// --- Teams routes (GET public, mutations coach-only) ---
const teamsRouter = express.Router();
teamsRouter.get('/', teamController.getAll);
teamsRouter.get('/:id', teamController.getOne);
teamsRouter.post('/', authenticate, requireRole('coach'), teamController.create);
teamsRouter.put('/:id', authenticate, requireRole('coach'), teamController.update);
teamsRouter.delete('/:id', authenticate, requireRole('coach'), teamController.deleteOne);
teamsRouter.delete('/', authenticate, requireRole('coach'), teamController.deleteAll);
app.use('/api/teams', teamsRouter);

// --- Players routes (GET public, mutations coach-only) ---
const playersRouter = express.Router();
playersRouter.get('/', playerController.getAll);
playersRouter.get('/:id', playerController.getOne);
playersRouter.post('/', authenticate, requireRole('coach'), playerController.create);
playersRouter.put('/:id', authenticate, requireRole('coach'), playerController.update);
playersRouter.delete('/:id', authenticate, requireRole('coach'), playerController.deleteOne);
playersRouter.delete('/', authenticate, requireRole('coach'), playerController.deleteAll);
app.use('/api/players', playersRouter);

// --- Games routes (GET requires approved, mutations coach-only) ---
const gamesRouter = express.Router();
gamesRouter.get('/', authenticate, requireApproved, gameController.getAll);
gamesRouter.get('/:id', authenticate, requireApproved, gameController.getOne);
gamesRouter.post('/', authenticate, requireRole('coach'), gameController.create);
gamesRouter.put('/:id/score', authenticate, requireRole('coach'), gameController.updateScore);
gamesRouter.put('/:id/finish', authenticate, requireRole('coach'), gameController.finishGame);
gamesRouter.put('/:id/live', authenticate, requireApproved, gameController.updateLiveState);
gamesRouter.put('/:id', authenticate, requireRole('coach'), gameController.updateGameInfo);
gamesRouter.delete('/:id', authenticate, requireRole('coach'), gameController.deleteOne);
gamesRouter.delete('/', authenticate, requireRole('coach'), gameController.deleteAll);
app.use('/api/games', gamesRouter);

// --- Stats routes (all require approved) ---
const statsRouter = express.Router();
statsRouter.get('/history', authenticate, requireApproved, statTrackerController.getHistory);
statsRouter.get('/history/final', authenticate, requireApproved, statTrackerController.getFinalStatsForGames);
statsRouter.get('/history/game/:gameId', authenticate, requireApproved, statTrackerController.getGameHistory);
statsRouter.get('/history/player', authenticate, requireApproved, statTrackerController.getPlayerHistory);
statsRouter.get('/', authenticate, requireApproved, statTrackerController.getAll);
statsRouter.get('/:id', authenticate, requireApproved, statTrackerController.getOne);
statsRouter.post('/', authenticate, requireApproved, statTrackerController.create);
statsRouter.put('/:id', authenticate, requireApproved, statTrackerController.update);
statsRouter.delete('/:id', authenticate, requireApproved, statTrackerController.deleteOne);
statsRouter.delete('/', authenticate, requireApproved, statTrackerController.deleteAll);
statsRouter.post('/bulk', authenticate, requireApproved, statTrackerController.bulkSave);
app.use('/api/stats', statsRouter);

// --- Faceoff routes (all require approved) ---
const faceoffRouter = express.Router();
faceoffRouter.get('/', authenticate, requireApproved, faceoffController.getByGame);
faceoffRouter.post('/', authenticate, requireApproved, faceoffController.create);
faceoffRouter.post('/undo', authenticate, requireApproved, faceoffController.undoLast);
app.use('/api/faceoffs', faceoffRouter);

// --- Hit/Penalty routes (all require approved) ---
const hitPenaltyRouter = express.Router();
hitPenaltyRouter.get('/', authenticate, requireApproved, hitPenaltyController.getByGame);
hitPenaltyRouter.post('/', authenticate, requireApproved, hitPenaltyController.create);
hitPenaltyRouter.post('/undo', authenticate, requireApproved, hitPenaltyController.undoLast);
app.use('/api/hit-penalties', hitPenaltyRouter);

// --- Stat roles routes (all require approved) ---
const rolesRouter = express.Router();
rolesRouter.get("/", authenticate, requireApproved, statRoleController.getAll);
rolesRouter.post("/bulk", authenticate, requireApproved, statRoleController.bulkSave);
app.use("/api/stat-roles", rolesRouter);

// --- Notifications routes (authenticated) ---
const notificationsRouter = express.Router();
notificationsRouter.get('/', authenticate, notificationController.getMine);
notificationsRouter.get('/unread-status', authenticate, notificationController.getUnreadStatus);
notificationsRouter.put('/mark-seen', authenticate, notificationController.markMineSeen);
app.use('/api/notifications', notificationsRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
