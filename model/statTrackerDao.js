const mongoose = require('mongoose');

// ── GameEvent: unified event log for both teams (replaces Faceoff + HitPenalty) ──

const EVENT_TYPES = ['faceoff', 'hit', 'penalty', 'goal', 'assist', 'shot', 'save', 'goal_against'];

const GameEventSchema = new mongoose.Schema(
  {
    gameId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    teamId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },

    eventType: { type: String, enum: EVENT_TYPES, required: true },

    // Which side initiated / is the subject: 'home' or 'away'
    team: { type: String, enum: ['home', 'away'], required: true },

    // Home-team player (always an ObjectId referencing the Player collection)
    homePlayerId: { type: mongoose.Schema.Types.ObjectId, default: null },
    homePlayerName: { type: String, default: '' },
    homePlayerNumber: { type: Number, default: null },

    // Away-team player (name + number only — opponent roster has no _id in DB)
    awayPlayerName: { type: String, default: '' },
    awayPlayerNumber: { type: Number, default: null },

    // Faceoff-specific
    winner: { type: String, enum: ['home', 'away', null], default: null },

    // Penalty-specific
    penaltyMinutes: { type: Number, default: 0, min: 0 },

    // Game-clock context
    period: { type: Number, default: 1, min: 1 },
    clockSecondsRemaining: { type: Number, default: 1200, min: 0 },
    gameSecondsElapsed: { type: Number, default: 0, min: 0 },

    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

GameEventSchema.index({ gameId: 1, timestamp: 1 });
GameEventSchema.index({ gameId: 1, eventType: 1 });
GameEventSchema.index({ homePlayerId: 1, eventType: 1 });
GameEventSchema.index({ awayPlayerName: 1, awayPlayerNumber: 1, eventType: 1 });

const GameEvent = mongoose.model('GameEvent', GameEventSchema);

exports.EVENT_TYPES = EVENT_TYPES;

// ── GameEvent CRUD ──

exports.createEvent = async (data) => {
  const event = new GameEvent(data);
  return await event.save();
};

exports.getEventsByGame = async (gameId, eventType) => {
  const filter = { gameId };
  if (eventType) filter.eventType = eventType;
  return await GameEvent.find(filter).sort({ timestamp: -1 }).lean();
};

exports.deleteLastEvent = async (gameId, eventType) => {
  const filter = { gameId };
  if (eventType) filter.eventType = eventType;
  const last = await GameEvent.findOne(filter).sort({ timestamp: -1 });
  if (!last) return null;
  return await GameEvent.findByIdAndDelete(last._id).lean();
};

exports.deleteAllEvents = async (filter = {}) => {
  return await GameEvent.deleteMany(filter);
};

exports.GameEvent = GameEvent;

// ── StatHistory & StatLine (unchanged — cumulative stat snapshots per player) ──

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
    goalsAgainst: { type: Number, default: 0, min: 0 },
    faceoffsWon: { type: Number, default: 0, min: 0 },
    faceoffsLost: { type: Number, default: 0, min: 0 }
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
    goalsAgainst: { type: Number, default: 0, min: 0 },
    faceoffsWon: { type: Number, default: 0, min: 0 },
    faceoffsLost: { type: Number, default: 0, min: 0 }
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
  goalsAgainst: statData.goalsAgainst || 0,
  faceoffsWon: statData.faceoffsWon || 0,
  faceoffsLost: statData.faceoffsLost || 0
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

// ── PossessionSnapshot: time-of-possession tracking per game ──

const PossessionSnapshotSchema = new mongoose.Schema(
  {
    gameId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    teamId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    homeSeconds: { type: Number, default: 0, min: 0 },
    awaySeconds: { type: Number, default: 0, min: 0 },
    period: { type: Number, default: 1, min: 1 },
    clockSecondsRemaining: { type: Number, default: 1200, min: 0 },
    gameSecondsElapsed: { type: Number, default: 0, min: 0 },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

PossessionSnapshotSchema.index({ gameId: 1, gameSecondsElapsed: 1 });

const PossessionSnapshot = mongoose.model('PossessionSnapshot', PossessionSnapshotSchema);

exports.PossessionSnapshot = PossessionSnapshot;

exports.savePossession = async (data) => {
  const snap = new PossessionSnapshot(data);
  return await snap.save();
};

exports.getPossessionByGame = async (gameId) => {
  if (!gameId || !mongoose.Types.ObjectId.isValid(gameId)) return [];
  return await PossessionSnapshot.find({ gameId: new mongoose.Types.ObjectId(gameId) })
    .sort({ gameSecondsElapsed: 1, timestamp: 1 })
    .lean();
};

exports.getLatestPossession = async (gameId) => {
  if (!gameId || !mongoose.Types.ObjectId.isValid(gameId)) return null;
  return await PossessionSnapshot.findOne({ gameId: new mongoose.Types.ObjectId(gameId) })
    .sort({ timestamp: -1 })
    .lean();
};

exports.deletePossessionByGame = async (gameId) => {
  if (!gameId) return;
  return await PossessionSnapshot.deleteMany({ gameId });
};

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
        faceoffsWon: { $last: '$faceoffsWon' },
        faceoffsLost: { $last: '$faceoffsLost' },
      }
    },
    { $project: { _id: 0 } }
  ]);
};