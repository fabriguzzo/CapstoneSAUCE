const mongoose = require('mongoose');

const StatHistorySchema = new mongoose.Schema(
  {
    gameId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    teamId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    playerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },

    timestamp: { type: Date, default: Date.now, index: true },

    period: { type: Number, default: 1, min: 1 },
    clockSecondsRemaining: { type: Number, default: 1200, min: 0 },
    gameSecondsElapsed: { type: Number, default: 0, min: 0 },

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
StatHistorySchema.index({ gameId: 1, gameSecondsElapsed: 1 });

const StatHistory = mongoose.model('StatHistory', StatHistorySchema);

const StatLineSchema = new mongoose.Schema(
  {
    gameId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    teamId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    playerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },

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

StatLineSchema.index({ gameId: 1, playerId: 1 }, { unique: true });

const StatLine = mongoose.model('StatLine', StatLineSchema);

const buildHistoryDoc = (statData) => ({
  gameId: statData.gameId,
  teamId: statData.teamId,
  playerId: statData.playerId,
  timestamp: statData.timestamp ? new Date(statData.timestamp) : new Date(),

  period: Number.isFinite(Number(statData.period)) ? Number(statData.period) : 1,
  clockSecondsRemaining: Number.isFinite(Number(statData.clockSecondsRemaining))
    ? Number(statData.clockSecondsRemaining)
    : 1200,
  gameSecondsElapsed: Number.isFinite(Number(statData.gameSecondsElapsed))
    ? Number(statData.gameSecondsElapsed)
    : 0,

  goals: statData.goals || 0,
  assists: statData.assists || 0,
  shots: statData.shots || 0,
  hits: statData.hits || 0,
  pim: statData.pim || 0,
  plusMinus: statData.plusMinus || 0,
  saves: statData.saves || 0,
  goalsAgainst: statData.goalsAgainst || 0
});

const saveHistory = async (statData) => {
  const historyEntry = new StatHistory(buildHistoryDoc(statData));
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
      document: buildHistoryDoc(line)
    }
  }));

  if (historyOps.length > 0) {
    await StatHistory.bulkWrite(historyOps);
  }

  return result;
};

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
  return await StatHistory.find(mongooseFilter)
    .sort({ gameSecondsElapsed: 1, timestamp: 1 })
    .lean();
};

exports.getPlayerHistory = async (gameId, playerId) => {
  const query = {};
  if (gameId && mongoose.Types.ObjectId.isValid(gameId)) {
    query.gameId = new mongoose.Types.ObjectId(gameId);
  }
  if (playerId && mongoose.Types.ObjectId.isValid(playerId)) {
    query.playerId = new mongoose.Types.ObjectId(playerId);
  }
  return await StatHistory.find(query)
    .sort({ gameSecondsElapsed: 1, timestamp: 1 })
    .lean();
};

exports.getGameHistory = async (gameId) => {
  const query = {};
  if (gameId && mongoose.Types.ObjectId.isValid(gameId)) {
    query.gameId = new mongoose.Types.ObjectId(gameId);
  }
  return await StatHistory.find(query)
    .sort({ gameSecondsElapsed: 1, timestamp: 1 })
    .lean();
};

// Get the final (latest) stat snapshot per player for each of multiple games
exports.getFinalStatsForGames = async (gameIds) => {
  const objectIds = gameIds
    .filter(id => mongoose.Types.ObjectId.isValid(id))
    .map(id => new mongoose.Types.ObjectId(id));

  if (objectIds.length === 0) return [];

  return await StatHistory.aggregate([
    { $match: { gameId: { $in: objectIds } } },
    { $sort: { gameSecondsElapsed: 1, timestamp: 1 } },
    {
      $group: {
        _id: { gameId: '$gameId', playerId: '$playerId' },
        gameId: { $last: '$gameId' },
        teamId: { $last: '$teamId' },
        playerId: { $last: '$playerId' },
        goals: { $last: '$goals' },
        assists: { $last: '$assists' },
        shots: { $last: '$shots' },
        hits: { $last: '$hits' },
        pim: { $last: '$pim' },
        plusMinus: { $last: '$plusMinus' },
        saves: { $last: '$saves' },
        goalsAgainst: { $last: '$goalsAgainst' },
      }
    },
    { $project: { _id: 0 } }
  ]);
};