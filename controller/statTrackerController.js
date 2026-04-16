const dao = require('../model/statTrackerDao.js');
const mongoose = require("mongoose");
const Player = mongoose.model("Player");

function toIntOrZero(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function validateNonNegativeInt(n) {
  return Number.isInteger(n) && n >= 0;
}

function validateStatPayload(body, { allowMissing = false } = {}) {
  // If allowMissing=true, only validate fields that exist (for PATCH)
  const fields = [
    'goals', 'assists', 'shots', 'hits', 'pim', 'saves', 'goalsAgainst', 'faceoffsWon', 'faceoffsLost'
  ];

  for (const f of fields) {
    if (allowMissing && body[f] === undefined) continue;
    const val = toIntOrZero(body[f]);
    if (!validateNonNegativeInt(val)) return `${f} must be a non-negative integer`;
  }

  if (!allowMissing && body.plusMinus === undefined) body.plusMinus = 0;
  if (!allowMissing || body.plusMinus !== undefined) {
    const pm = Number(body.plusMinus);
    if (!Number.isFinite(pm) || !Number.isInteger(pm)) return 'plusMinus must be an integer';
  }

  return null;
}

async function validatePlayerBelongsToTeam(playerId, teamId) {
  const exists = await Player.countDocuments({ _id: playerId, teamId });
  return exists === 1;
}

// Create one stat line
exports.create = async function (req, res) {
  try {
    const { gameId, teamId, playerId } = req.body;

    if (!gameId) return res.status(400).json({ error: 'Game ID is required' });
    if (!teamId) return res.status(400).json({ error: 'Team ID is required' });
    if (!playerId) return res.status(400).json({ error: 'Player ID is required' });

    // Validate player belongs to team
    const ok = await validatePlayerBelongsToTeam(playerId, teamId);
    if (!ok) return res.status(400).json({ error: 'Player does not belong to the provided team' });

    const errMsg = validateStatPayload(req.body, { allowMissing: false });
    if (errMsg) return res.status(400).json({ error: errMsg });

    const statData = {
      gameId,
      teamId,
      playerId,
      goals: toIntOrZero(req.body.goals),
      assists: toIntOrZero(req.body.assists),
      shots: toIntOrZero(req.body.shots),
      hits: toIntOrZero(req.body.hits),
      pim: toIntOrZero(req.body.pim),
      plusMinus: Number(req.body.plusMinus) || 0,
      saves: toIntOrZero(req.body.saves),
      goalsAgainst: toIntOrZero(req.body.goalsAgainst),
      faceoffsWon: toIntOrZero(req.body.faceoffsWon),
      faceoffsLost: toIntOrZero(req.body.faceoffsLost),
    };

    const created = await dao.create(statData);
    return res.status(201).json(created);
  } catch (err) {
    console.error('Error creating stat line:', err);
    // Duplicate key => already exists for this player/game
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Stat line already exists for this player in this game' });
    }
    return res.status(500).json({ error: 'Failed to create stat line' });
  }
};

// Get all stat lines (filters) - returns latest stats from StatHistory
exports.getAll = async function (req, res) {
  try {
    const { gameId, teamId, playerId } = req.query;

    const filter = {};
    if (gameId) filter.gameId = gameId;
    if (teamId) filter.teamId = teamId;
    if (playerId) filter.playerId = playerId;

    const stats = await dao.readAll(filter);
    return res.status(200).json(stats);
  } catch (err) {
    console.error('Error fetching stat lines:', err);
    return res.status(500).json({ error: 'Failed to retrieve stat lines' });
  }
};

// Get one stat line
exports.getOne = async function (req, res) {
  try {
    const id = req.params.id;
    const stat = await dao.read(id);
    if (!stat) return res.status(404).json({ error: 'Stat line not found' });
    return res.status(200).json(stat);
  } catch (err) {
    console.error('Error fetching stat line:', err);
    return res.status(500).json({ error: 'Failed to retrieve stat line' });
  }
};

// Update stat line
exports.update = async function (req, res) {
  try {
    const id = req.params.id;

    const errMsg = validateStatPayload(req.body, { allowMissing: true });
    if (errMsg) return res.status(400).json({ error: errMsg });

    const update = {};
    const setIfProvided = (k, v) => {
      if (v !== undefined) update[k] = v;
    };

    setIfProvided('goals', req.body.goals !== undefined ? toIntOrZero(req.body.goals) : undefined);
    setIfProvided('assists', req.body.assists !== undefined ? toIntOrZero(req.body.assists) : undefined);
    setIfProvided('shots', req.body.shots !== undefined ? toIntOrZero(req.body.shots) : undefined);
    setIfProvided('hits', req.body.hits !== undefined ? toIntOrZero(req.body.hits) : undefined);
    setIfProvided('pim', req.body.pim !== undefined ? toIntOrZero(req.body.pim) : undefined);
    setIfProvided('plusMinus', req.body.plusMinus !== undefined ? Number(req.body.plusMinus) : undefined);
    setIfProvided('saves', req.body.saves !== undefined ? toIntOrZero(req.body.saves) : undefined);
    setIfProvided('goalsAgainst', req.body.goalsAgainst !== undefined ? toIntOrZero(req.body.goalsAgainst) : undefined);

    const updated = await dao.update(id, update);
    if (!updated) return res.status(404).json({ error: 'Stat line not found' });

    return res.status(200).json(updated);
  } catch (err) {
    console.error('Error updating stat line:', err);
    return res.status(500).json({ error: 'Failed to update stat line' });
  }
};

// Delete one
exports.deleteOne = async function (req, res) {
  try {
    const id = req.params.id;
    const deleted = await dao.del(id);
    if (!deleted) return res.status(404).json({ error: 'Stat line not found' });
    return res.status(200).json({ message: 'Stat line deleted successfully' });
  } catch (err) {
    console.error('Error deleting stat line:', err);
    return res.status(500).json({ error: 'Failed to delete stat line' });
  }
};

// Delete all (optionally filter by gameId/teamId/playerId)
exports.deleteAll = async function (req, res) {
  try {
    const filter = {};
    if (req.query.gameId) filter.gameId = req.query.gameId;
    if (req.query.teamId) filter.teamId = req.query.teamId;
    if (req.query.playerId) filter.playerId = req.query.playerId;

    await dao.deleteAll(filter);
    return res.status(200).json({ message: 'Stat lines deleted successfully' });
  } catch (err) {
    console.error('Error deleting stat lines:', err);
    return res.status(500).json({ error: 'Failed to delete stat lines' });
  }
};

// Bulk save / upsert 15 lines (recommended for your UI)
exports.bulkSave = async function (req, res) {
  try {
    const { gameId, teamId, lines } = req.body;
    const historyMeta = req.body.historyMeta || {};

    if (!gameId) return res.status(400).json({ error: 'Game ID is required' });
    if (!teamId) return res.status(400).json({ error: 'Team ID is required' });
    if (!Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ error: 'lines must be a non-empty array' });
    }

    // Basic validation and normalize
    const normalized = [];
    for (const l of lines) {
      if (!l.playerId) return res.status(400).json({ error: 'Each line must include playerId' });

      const errMsg = validateStatPayload(l, { allowMissing: false });
      if (errMsg) return res.status(400).json({ error: errMsg });

      normalized.push({
        gameId,
        teamId,
        playerId: l.playerId,
        goals: toIntOrZero(l.goals),
        assists: toIntOrZero(l.assists),
        shots: toIntOrZero(l.shots),
        hits: toIntOrZero(l.hits),
        pim: toIntOrZero(l.pim),
        plusMinus: Number(l.plusMinus) || 0,
        saves: toIntOrZero(l.saves),
        goalsAgainst: toIntOrZero(l.goalsAgainst),
        faceoffsWon: toIntOrZero(l.faceoffsWon),
        faceoffsLost: toIntOrZero(l.faceoffsLost),
        period: Number(historyMeta.period) || 1,
        clockSecondsRemaining: Number.isFinite(Number(historyMeta.clockSecondsRemaining))
          ? Number(historyMeta.clockSecondsRemaining)
          : 1200,
        gameSecondsElapsed: Number.isFinite(Number(historyMeta.gameSecondsElapsed))
          ? Number(historyMeta.gameSecondsElapsed)
          : 0,
      });
    }

    // Validate all players belong to team (fast check)
    const playerIds = normalized.map(x => x.playerId);
    const count = await Player.countDocuments({ _id: { $in: playerIds }, teamId });
    if (count !== playerIds.length) {
      return res.status(400).json({ error: 'One or more players do not belong to the provided team' });
    }

    const result = await dao.bulkUpsert(normalized);
    return res.status(200).json({ message: 'Stats saved', result });
  } catch (err) {
    console.error('Error bulk saving stats:', err);
    return res.status(500).json({ error: 'Failed to save stats' });
  }
};

// Get stat history (for graphing)
exports.getHistory = async function (req, res) {
  try {
    const filter = {};
    if (req.query.gameId) filter.gameId = req.query.gameId;
    if (req.query.teamId) filter.teamId = req.query.teamId;
    if (req.query.playerId) filter.playerId = req.query.playerId;

    const history = await dao.getHistory(filter);
    return res.status(200).json(history);
  } catch (err) {
    console.error('Error fetching stat history:', err);
    return res.status(500).json({ error: 'Failed to retrieve stat history' });
  }
};

// Get history for a specific player in a game
exports.getPlayerHistory = async function (req, res) {
  try {
    const { gameId, playerId } = req.query;
    if (!gameId) return res.status(400).json({ error: 'Game ID is required' });
    if (!playerId) return res.status(400).json({ error: 'Player ID is required' });

    const history = await dao.getPlayerHistory(gameId, playerId);
    return res.status(200).json(history);
  } catch (err) {
    console.error('Error fetching player stat history:', err);
    return res.status(500).json({ error: 'Failed to retrieve player stat history' });
  }
};

// Get final stats for multiple games (for opponent overview)
exports.getFinalStatsForGames = async function (req, res) {
  try {
    const { gameIds } = req.query;
    if (!gameIds) return res.status(400).json({ error: 'gameIds query parameter is required' });

    const ids = gameIds.split(',').map(id => id.trim()).filter(Boolean);
    if (ids.length === 0) return res.status(400).json({ error: 'No valid game IDs provided' });

    const stats = await dao.getFinalStatsForGames(ids);
    return res.status(200).json(stats);
  } catch (err) {
    console.error('Error fetching final stats for games:', err);
    return res.status(500).json({ error: 'Failed to retrieve final stats' });
  }
};

// Get history for an entire game
exports.getGameHistory = async function (req, res) {
  try {
    const gameId = req.params.gameId || req.query.gameId;
    if (!gameId) return res.status(400).json({ error: 'Game ID is required' });

    const history = await dao.getGameHistory(gameId);
    return res.status(200).json(history);
  } catch (err) {
    console.error('Error fetching game stat history:', err);
    return res.status(500).json({ error: 'Failed to retrieve game stat history' });
  }
};

// ── GameEvent endpoints (faceoffs, hits, penalties for both teams) ──

exports.createEvent = async function (req, res) {
  try {
    const { gameId, teamId, eventType, team, winner, penaltyMinutes,
            homePlayerId, homePlayerName, homePlayerNumber,
            awayPlayerName, awayPlayerNumber,
            period, clockSecondsRemaining, gameSecondsElapsed } = req.body;

    if (!gameId) return res.status(400).json({ error: 'Game ID is required' });
    if (!teamId) return res.status(400).json({ error: 'Team ID is required' });
    if (!dao.EVENT_TYPES.includes(eventType)) {
      return res.status(400).json({ error: `eventType must be one of: ${dao.EVENT_TYPES.join(', ')}` });
    }
    if (!['home', 'away'].includes(team)) {
      return res.status(400).json({ error: 'team must be "home" or "away"' });
    }

    if (eventType === 'faceoff') {
      if (!['home', 'away'].includes(winner)) {
        return res.status(400).json({ error: 'winner must be "home" or "away" for faceoffs' });
      }
      if (!homePlayerName && !homePlayerId) {
        return res.status(400).json({ error: 'Home player info is required for faceoffs' });
      }
      if (!awayPlayerName) {
        return res.status(400).json({ error: 'Away player name is required for faceoffs' });
      }
    }

    if (eventType === 'penalty') {
      const mins = Number(penaltyMinutes);
      if (!Number.isFinite(mins) || mins <= 0) {
        return res.status(400).json({ error: 'penaltyMinutes must be a positive number for penalties' });
      }
    }

    const doc = await dao.createEvent({
      gameId,
      teamId,
      eventType,
      team,
      homePlayerId: homePlayerId || null,
      homePlayerName: homePlayerName ? String(homePlayerName) : '',
      homePlayerNumber: homePlayerNumber != null ? Number(homePlayerNumber) : null,
      awayPlayerName: awayPlayerName ? String(awayPlayerName) : '',
      awayPlayerNumber: awayPlayerNumber != null ? Number(awayPlayerNumber) : null,
      winner: eventType === 'faceoff' ? winner : null,
      penaltyMinutes: eventType === 'penalty' ? Number(penaltyMinutes) : 0,
      period: Number(period) || 1,
      clockSecondsRemaining: Number.isFinite(Number(clockSecondsRemaining)) ? Number(clockSecondsRemaining) : 1200,
      gameSecondsElapsed: Number.isFinite(Number(gameSecondsElapsed)) ? Number(gameSecondsElapsed) : 0,
      timestamp: new Date(),
    });

    return res.status(201).json(doc);
  } catch (err) {
    console.error('Error creating game event:', err);
    return res.status(500).json({ error: 'Failed to create game event' });
  }
};

exports.getEventsByGame = async function (req, res) {
  try {
    const { gameId, eventType } = req.query;
    if (!gameId) return res.status(400).json({ error: 'Game ID is required' });

    const events = await dao.getEventsByGame(gameId, eventType || null);
    return res.status(200).json(events);
  } catch (err) {
    console.error('Error fetching game events:', err);
    return res.status(500).json({ error: 'Failed to retrieve game events' });
  }
};

exports.undoLastEvent = async function (req, res) {
  try {
    const { gameId, eventType } = req.body;
    if (!gameId) return res.status(400).json({ error: 'Game ID is required' });

    const deleted = await dao.deleteLastEvent(gameId, eventType || null);
    if (!deleted) return res.status(404).json({ error: 'No events to undo' });

    return res.status(200).json({ message: 'Last event undone', deleted });
  } catch (err) {
    console.error('Error undoing game event:', err);
    return res.status(500).json({ error: 'Failed to undo game event' });
  }
};

// ── Possession endpoints ──

exports.savePossession = async function (req, res) {
  try {
    const { gameId, teamId, homeSeconds, awaySeconds, period, clockSecondsRemaining, gameSecondsElapsed } = req.body;

    if (!gameId) return res.status(400).json({ error: 'Game ID is required' });
    if (!teamId) return res.status(400).json({ error: 'Team ID is required' });

    const hs = Number(homeSeconds);
    const as = Number(awaySeconds);
    if (!Number.isFinite(hs) || hs < 0) return res.status(400).json({ error: 'homeSeconds must be a non-negative number' });
    if (!Number.isFinite(as) || as < 0) return res.status(400).json({ error: 'awaySeconds must be a non-negative number' });

    const doc = await dao.savePossession({
      gameId,
      teamId,
      homeSeconds: Math.round(hs),
      awaySeconds: Math.round(as),
      period: Number(period) || 1,
      clockSecondsRemaining: Number.isFinite(Number(clockSecondsRemaining)) ? Number(clockSecondsRemaining) : 1200,
      gameSecondsElapsed: Number.isFinite(Number(gameSecondsElapsed)) ? Number(gameSecondsElapsed) : 0,
      timestamp: new Date(),
    });

    return res.status(201).json(doc);
  } catch (err) {
    console.error('Error saving possession:', err);
    return res.status(500).json({ error: 'Failed to save possession' });
  }
};

exports.getPossession = async function (req, res) {
  try {
    const gameId = req.params.gameId || req.query.gameId;
    if (!gameId) return res.status(400).json({ error: 'Game ID is required' });

    const snapshots = await dao.getPossessionByGame(gameId);
    return res.status(200).json(snapshots);
  } catch (err) {
    console.error('Error fetching possession:', err);
    return res.status(500).json({ error: 'Failed to retrieve possession data' });
  }
};

exports.getLatestPossession = async function (req, res) {
  try {
    const gameId = req.params.gameId || req.query.gameId;
    if (!gameId) return res.status(400).json({ error: 'Game ID is required' });

    const latest = await dao.getLatestPossession(gameId);
    return res.status(200).json(latest || { homeSeconds: 0, awaySeconds: 0 });
  } catch (err) {
    console.error('Error fetching latest possession:', err);
    return res.status(500).json({ error: 'Failed to retrieve latest possession' });
  }
};

// Update a game event (e.g. mark a successful pass as an assist)
exports.updateEvent = async function (req, res) {
  try {
    const eventId = req.params.id;
    if (!eventId) return res.status(400).json({ error: 'Event ID is required' });

    const allowedFields = ['isAssist'];
    const update = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) update[field] = req.body[field];
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const updated = await dao.updateEvent(eventId, update);
    if (!updated) return res.status(404).json({ error: 'Event not found' });

    return res.status(200).json(updated);
  } catch (err) {
    console.error('Error updating game event:', err);
    return res.status(500).json({ error: 'Failed to update game event' });
  }
};
