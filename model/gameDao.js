const mongoose = require('mongoose');

const PlayerSchema = new mongoose.Schema(
  {
    number: Number,
    name: String
  },
  { _id: false }
);

const LineupEntrySchema = new mongoose.Schema(
  {
    playerId: mongoose.Schema.Types.ObjectId,
    slot: Number
  },
  { _id: false }
);

const GAME_TYPES = [
  'regular-season',
  'league',
  'out-of-league',
  'playoff',
  'final',
  'tournament'
];

const GAME_STATUS = ['scheduled', 'live', 'intermission', 'final'];

const GameSchema = new mongoose.Schema({
  teamId: { type: mongoose.Schema.Types.ObjectId, required: true },

  gameType: { type: String, enum: GAME_TYPES, required: true },

  gameDate: { type: Date, required: true },

  lineup: [LineupEntrySchema],

  opponent: {
    teamName: String,
    roster: [PlayerSchema]
  },

  score: {
    us: { type: Number, default: 0 },
    them: { type: Number, default: 0 }
  },

  status: {
    type: String,
    enum: GAME_STATUS,
    default: 'scheduled'
  },

  currentPeriod: {
    type: Number,
    default: 1,
    min: 1
  },

  clockSecondsRemaining: {
    type: Number,
    default: 1200,
    min: 0
  },

  clockStartedAt: { type: Date, default: null },

  startTime: Date,
  endTime: Date,

  result: String,

  dateCreated: { type: Date, default: Date.now },
  dateUpdated: Date,
  dateFinished: Date
});

const Game = mongoose.model('Game', GameSchema);

exports.GAME_TYPES = GAME_TYPES;
exports.GAME_STATUS = GAME_STATUS;

exports.create = async (data) => {
  const game = new Game(data);
  return await game.save();
};

exports.readAll = async (filter = {}) => {
  return await Game.find(filter).sort({ gameDate: -1 }).lean();
};

exports.read = async (id) => {
  return await Game.findById(id).lean();
};

exports.update = async (id, updateData) => {
  updateData.dateUpdated = new Date();
  return await Game.findByIdAndUpdate(id, updateData, { new: true }).lean();
};

exports.del = async (id) => {
  return await Game.findByIdAndDelete(id).lean();
};

exports.deleteAll = async (filter = {}) => {
  return await Game.deleteMany(filter);
};
