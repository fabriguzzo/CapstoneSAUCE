const mongoose = require('mongoose');

const StatHistorySchema = new mongoose.Schema(
  {
    gameId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    teamId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    playerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    timestamp: { type: Date, default: Date.now, index: true },

    goals: { type: Number, default: 0, min: 0 },
    assists: { type: Number, default: 0, min: 0 },
    shots: { type: Number, default: 0, min: 0 },
    hits: { type: Number, default: 0, min: 0 },
    pim: { type: Number, default: 0, min: 0 },
    plusMinus: { type: Number, default: 0 },
    saves: { type: Number, default: 0, min: 0 },
    goalsAgainst: { type: Number, default: 0, min: 0 }
  },
  { timestamps: true }
);

StatHistorySchema.index({ gameId: 1, playerId: 1, timestamp: 1 });

const StatHistory = mongoose.model('StatHistory', StatHistorySchema);

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

const saveHistory = async (statData) => {
  const historyEntry = new StatHistory({
    gameId: statData.gameId,
    teamId: statData.teamId,
    playerId: statData.playerId,
    timestamp: new Date(),
    goals: statData.goals || 0,
    assists: statData.assists || 0,
    shots: statData.shots || 0,
    hits: statData.hits || 0,
    pim: statData.pim || 0,
    plusMinus: statData.plusMinus || 0,
    saves: statData.saves || 0,
    goalsAgainst: statData.goalsAgainst || 0
  });
  await historyEntry.save();
};

exports.create = async (data) => {
  const stat = new StatLine(data);
  await stat.save();
  await saveHistory(data);
  return stat;
};

exports.readAll = async (filter = {}) => {
  return await StatLine.find(filter).sort({ createdAt: -1 }).lean();
};

exports.read = async (id) => {
  return await StatLine.findById(id).lean();
};

exports.update = async (id, updateData) => {
  const stat = await StatLine.findById(id).lean();
  if (stat) {
    await saveHistory({ ...stat, ...updateData });
  }
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

  const historyOps = lines.map((line) => ({
    insertOne: {
      document: {
        gameId: line.gameId,
        teamId: line.teamId,
        playerId: line.playerId,
        timestamp: new Date(),
        goals: line.goals || 0,
        assists: line.assists || 0,
        shots: line.shots || 0,
        hits: line.hits || 0,
        pim: line.pim || 0,
        plusMinus: line.plusMinus || 0,
        saves: line.saves || 0,
        goalsAgainst: line.goalsAgainst || 0
      }
    }
  }));

  if (historyOps.length > 0) {
    await StatHistory.bulkWrite(historyOps);
  }

  return result;
};

// Export model if you ever need it elsewhere
exports.StatLine = StatLine;
exports.StatHistory = StatHistory;

exports.getHistory = async (filter = {}) => {
  const mongooseFilter = {};
  for (const [key, value] of Object.entries(filter)) {
    if (value && mongoose.Types.ObjectId.isValid(value)) {
      mongooseFilter[key] = new mongoose.Types.ObjectId(value);
    } else {
      mongooseFilter[key] = value;
    }
  }
  return await StatHistory.find(mongooseFilter).sort({ timestamp: 1 }).lean();
};

exports.getPlayerHistory = async (gameId, playerId) => {
  const query = {};
  if (gameId && mongoose.Types.ObjectId.isValid(gameId)) {
    query.gameId = new mongoose.Types.ObjectId(gameId);
  }
  if (playerId && mongoose.Types.ObjectId.isValid(playerId)) {
    query.playerId = new mongoose.Types.ObjectId(playerId);
  }
  return await StatHistory.find(query).sort({ timestamp: 1 }).lean();
};

exports.getGameHistory = async (gameId) => {
  const query = {};
  if (gameId && mongoose.Types.ObjectId.isValid(gameId)) {
    query.gameId = new mongoose.Types.ObjectId(gameId);
  }
  return await StatHistory.find(query).sort({ timestamp: 1 }).lean();
};