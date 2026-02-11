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

const GameSchema = new mongoose.Schema({
  teamId: { type: mongoose.Schema.Types.ObjectId, required: true },

  gameType: { type: String, enum: GAME_TYPES, required: true },

  gameDate: { type: Date, required: true },

  lineup: [LineupEntrySchema], // 15 selected players

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
    enum: ['scheduled', 'in-progress', 'finished'],
    default: 'scheduled'
  },

  result: String,

  dateCreated: { type: Date, default: Date.now },
  dateUpdated: Date
});

const Game = mongoose.model('Game', GameSchema);

exports.GAME_TYPES = GAME_TYPES;

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

