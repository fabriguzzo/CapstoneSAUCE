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
    'goals', 'assists', 'shots', 'hits', 'pim', 'saves', 'goalsAgainst'
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

// Get all stat lines (filters)
exports.getAll = async function (req, res) {
  try {
    const filter = {};
    if (req.query.gameId) filter.gameId = req.query.gameId;
    if (req.query.teamId) filter.teamId = req.query.teamId;
    if (req.query.playerId) filter.playerId = req.query.playerId;

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