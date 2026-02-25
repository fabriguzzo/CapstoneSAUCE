const mongoose = require('mongoose');

const StatLineSchema = new mongoose.Schema(
  {
    gameId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    teamId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    playerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },

    // Common hockey stats (edit to your needs)
    goals: { type: Number, default: 0, min: 0 },
    assists: { type: Number, default: 0, min: 0 },
    shots: { type: Number, default: 0, min: 0 },
    hits: { type: Number, default: 0, min: 0 },
    pim: { type: Number, default: 0, min: 0 }, // penalty minutes
    plusMinus: { type: Number, default: 0 },   // can be negative

    // Optional for goalie lines 
    //saves: { type: Number, default: 0, min: 0 },
    //goalsAgainst: { type: Number, default: 0, min: 0 }
  },
  { timestamps: true }
);

// Prevent duplicates: one stat line per player per game
StatLineSchema.index({ gameId: 1, playerId: 1 }, { unique: true });

const StatLine = mongoose.model('StatLine', StatLineSchema);

exports.create = async (data) => {
  const stat = new StatLine(data);
  return await stat.save();
};

exports.readAll = async (filter = {}) => {
  return await StatLine.find(filter).sort({ createdAt: -1 }).lean();
};

exports.read = async (id) => {
  return await StatLine.findById(id).lean();
};

exports.update = async (id, updateData) => {
  return await StatLine.findByIdAndUpdate(id, updateData, { new: true }).lean();
};

exports.del = async (id) => {
  return await StatLine.findByIdAndDelete(id).lean();
};

exports.deleteAll = async (filter = {}) => {
  return await StatLine.deleteMany(filter);
};

// Bulk upsert: save 15 players in one call
exports.bulkUpsert = async (lines) => {
  const ops = lines.map((line) => ({
    updateOne: {
      filter: { gameId: line.gameId, playerId: line.playerId },
      update: { $set: line },
      upsert: true
    }
  }));

  const result = await StatLine.bulkWrite(ops);
  return result;
};

// Export model if you ever need it elsewhere
exports.StatLine = StatLine;