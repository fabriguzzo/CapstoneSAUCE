import { Router } from 'express';
import mongoose from 'mongoose';
import Player from '../models/Player';

const router = Router();

// GET /api/players - Get all players (optionally filtered by teamId)
router.get('/', async (req, res) => {
  try {
    const filter: any = {};
    
    if (req.query.teamId) {
      filter.teamId = req.query.teamId;
    }

    const players = await Player.find(filter).sort({ number: 1 });
    res.json(players);
  } catch (err) {
    console.error('Error fetching players:', err);
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

// GET /api/players/:id - Get a single player
router.get('/:id', async (req, res) => {
  try {
    const player = await Player.findById(req.params.id);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    res.json(player);
  } catch (err) {
    console.error('Error fetching player:', err);
    res.status(500).json({ error: 'Failed to fetch player' });
  }
});

// GET /api/players/team/:teamId - Get players by team
router.get('/team/:teamId', async (req, res) => {
  try {
    const players = await Player.find({ teamId: req.params.teamId }).sort({ number: 1 });
    res.json(players);
  } catch (err) {
    console.error('Error fetching team players:', err);
    res.status(500).json({ error: 'Failed to fetch team players' });
  }
});

// POST /api/players - Create a new player
router.post('/', async (req, res) => {
  try {
    const { name, number, teamId, position } = req.body;
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Player name is required' });
    }

    if (!Number.isInteger(Number(number)) || Number(number) < 1) {
      return res.status(400).json({ error: 'Player number must be a positive integer' });
    }

    if (!teamId || !mongoose.Types.ObjectId.isValid(teamId)) {
      return res.status(400).json({ error: 'Valid teamId is required' });
    }

    const player = new Player({
      name: name.trim(),
      number: Number(number),
      teamId: new mongoose.Types.ObjectId(teamId),
      position: position?.trim()
    });

    await player.save();
    res.status(201).json(player);
  } catch (err) {
    console.error('Error creating player:', err);
    res.status(500).json({ error: 'Failed to create player' });
  }
});

// POST /api/players/bulk - Create multiple players at once
router.post('/bulk', async (req, res) => {
  try {
    const { players, teamId } = req.body;
    
    if (!Array.isArray(players) || players.length === 0) {
      return res.status(400).json({ error: 'Players array is required' });
    }

    if (!teamId || !mongoose.Types.ObjectId.isValid(teamId)) {
      return res.status(400).json({ error: 'Valid teamId is required' });
    }

    const playerDocs = players.map(p => ({
      name: String(p.name).trim(),
      number: Number(p.number),
      teamId: new mongoose.Types.ObjectId(teamId),
      position: p.position?.trim()
    }));

    const createdPlayers = await Player.insertMany(playerDocs);
    res.status(201).json(createdPlayers);
  } catch (err) {
    console.error('Error creating players:', err);
    res.status(500).json({ error: 'Failed to create players' });
  }
});

// PUT /api/players/:id - Update a player
router.put('/:id', async (req, res) => {
  try {
    const { name, number, position } = req.body;
    const update: any = {};
    
    if (name !== undefined) update.name = name.trim();
    if (number !== undefined) update.number = Number(number);
    if (position !== undefined) update.position = position.trim();

    const player = await Player.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    );

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    res.json(player);
  } catch (err) {
    console.error('Error updating player:', err);
    res.status(500).json({ error: 'Failed to update player' });
  }
});

// DELETE /api/players/:id - Delete a player
router.delete('/:id', async (req, res) => {
  try {
    const player = await Player.findByIdAndDelete(req.params.id);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    res.json({ message: 'Player deleted successfully' });
  } catch (err) {
    console.error('Error deleting player:', err);
    res.status(500).json({ error: 'Failed to delete player' });
  }
});

export default router;
