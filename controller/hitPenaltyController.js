const dao = require('../model/hitPenaltyDao.js');

exports.create = async function (req, res) {
  try {
    const { gameId, teamId, playerId, playerName, playerNumber, type, penaltyMinutes } = req.body;

    if (!gameId) return res.status(400).json({ error: 'Game ID is required' });
    if (!teamId) return res.status(400).json({ error: 'Team ID is required' });
    if (!playerId) return res.status(400).json({ error: 'Player ID is required' });
    if (!playerName) return res.status(400).json({ error: 'Player name is required' });
    if (playerNumber == null) return res.status(400).json({ error: 'Player number is required' });
    if (!['hit', 'penalty'].includes(type)) return res.status(400).json({ error: 'Type must be "hit" or "penalty"' });

    if (type === 'penalty') {
      const mins = Number(penaltyMinutes);
      if (!Number.isFinite(mins) || mins <= 0) {
        return res.status(400).json({ error: 'penaltyMinutes must be a positive number for penalties' });
      }
    }

    const doc = await dao.create({
      gameId,
      teamId,
      playerId,
      playerName: String(playerName),
      playerNumber: Number(playerNumber),
      type,
      penaltyMinutes: type === 'penalty' ? Number(penaltyMinutes) : 0,
      timestamp: new Date(),
    });

    return res.status(201).json(doc);
  } catch (err) {
    console.error('Error creating hit/penalty:', err);
    return res.status(500).json({ error: 'Failed to create hit/penalty' });
  }
};

exports.getByGame = async function (req, res) {
  try {
    const { gameId } = req.query;
    if (!gameId) return res.status(400).json({ error: 'Game ID is required' });

    const records = await dao.getByGame(gameId);
    return res.status(200).json(records);
  } catch (err) {
    console.error('Error fetching hits/penalties:', err);
    return res.status(500).json({ error: 'Failed to retrieve hits/penalties' });
  }
};

exports.undoLast = async function (req, res) {
  try {
    const { gameId } = req.body;
    if (!gameId) return res.status(400).json({ error: 'Game ID is required' });

    const deleted = await dao.deleteLast(gameId);
    if (!deleted) return res.status(404).json({ error: 'No hits/penalties to undo' });

    return res.status(200).json({ message: 'Last hit/penalty undone', deleted });
  } catch (err) {
    console.error('Error undoing hit/penalty:', err);
    return res.status(500).json({ error: 'Failed to undo hit/penalty' });
  }
};
