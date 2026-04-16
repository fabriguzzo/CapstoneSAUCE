const dao = require('../model/faceoffDao.js');
const mongoose = require('mongoose');

exports.create = async function (req, res) {
  try {
    const { gameId, teamId, homePlayerId, homePlayerName, homePlayerNumber, awayPlayerName, awayPlayerNumber, winner } = req.body;

    if (!gameId) return res.status(400).json({ error: 'Game ID is required' });
    if (!teamId) return res.status(400).json({ error: 'Team ID is required' });
    if (!homePlayerId) return res.status(400).json({ error: 'Home player ID is required' });
    if (!homePlayerName) return res.status(400).json({ error: 'Home player name is required' });
    if (homePlayerNumber == null) return res.status(400).json({ error: 'Home player number is required' });
    if (!awayPlayerName) return res.status(400).json({ error: 'Away player name is required' });
    if (awayPlayerNumber == null) return res.status(400).json({ error: 'Away player number is required' });
    if (!['home', 'away'].includes(winner)) return res.status(400).json({ error: 'Winner must be "home" or "away"' });

    const faceoff = await dao.create({
      gameId,
      teamId,
      homePlayerId,
      homePlayerName: String(homePlayerName),
      homePlayerNumber: Number(homePlayerNumber),
      awayPlayerName: String(awayPlayerName),
      awayPlayerNumber: Number(awayPlayerNumber),
      winner,
      timestamp: new Date(),
    });

    return res.status(201).json(faceoff);
  } catch (err) {
    console.error('Error creating faceoff:', err);
    return res.status(500).json({ error: 'Failed to create faceoff' });
  }
};

exports.getByGame = async function (req, res) {
  try {
    const { gameId } = req.query;
    if (!gameId) return res.status(400).json({ error: 'Game ID is required' });

    const faceoffs = await dao.getByGame(gameId);
    return res.status(200).json(faceoffs);
  } catch (err) {
    console.error('Error fetching faceoffs:', err);
    return res.status(500).json({ error: 'Failed to retrieve faceoffs' });
  }
};

exports.undoLast = async function (req, res) {
  try {
    const { gameId } = req.body;
    if (!gameId) return res.status(400).json({ error: 'Game ID is required' });

    const deleted = await dao.deleteLast(gameId);
    if (!deleted) return res.status(404).json({ error: 'No faceoffs to undo' });

    return res.status(200).json({ message: 'Last faceoff undone', deleted });
  } catch (err) {
    console.error('Error undoing faceoff:', err);
    return res.status(500).json({ error: 'Failed to undo faceoff' });
  }
};
