import { Router } from 'express';
import mongoose from 'mongoose';
import Game, { GAME_TYPES } from '../models/Game';

const router = Router();

function normalizeGameType(value: string): typeof GAME_TYPES[number] | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return GAME_TYPES.includes(normalized as any) ? normalized as typeof GAME_TYPES[number] : null;
}

function isValidOpponentRoster(roster: any[]): boolean {
  if (!Array.isArray(roster) || roster.length !== 15) return false;
  return roster.every(p =>
    p &&
    Number.isFinite(Number(p.number)) &&
    typeof p.name === 'string' &&
    p.name.trim().length > 0
  );
}

function isValidLineup(lineup: any[]): boolean {
  if (!Array.isArray(lineup) || lineup.length !== 15) return false;

  const slots = new Set<number>();
  const players = new Set<string>();

  for (const entry of lineup) {
    if (!entry || !entry.playerId) return false;

    const slot = Number(entry.slot);
    if (!Number.isInteger(slot) || slot < 1 || slot > 15) return false;

    const pid = String(entry.playerId);
    if (players.has(pid)) return false;
    if (slots.has(slot)) return false;

    players.add(pid);
    slots.add(slot);
  }

  return true;
}

// GET /api/games - Get all games
router.get('/', async (req, res) => {
  try {
    const filter: any = {};

    if (typeof req.query.teamId === 'string' && req.query.teamId.trim().length > 0) {
      filter.teamId = req.query.teamId.trim();
    }

    if (typeof req.query.type !== 'undefined') {
      const requestedType = normalizeGameType(req.query.type as string);
      if (!requestedType) {
        return res.status(400).json({ error: 'Invalid game type filter' });
      }
      filter.gameType = requestedType;
    }

    const games = await Game.find(filter).sort({ gameDate: -1 });
    res.json(games);
  } catch (err) {
    console.error('Error fetching games:', err);
    res.status(500).json({ error: 'Failed to retrieve games' });
  }
});

// GET /api/games/:id - Get a single game
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid game ID' });
    }

    const game = await Game.findById(req.params.id);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.json(game);
  } catch (err) {
    console.error('Error fetching game:', err);
    res.status(500).json({ error: 'Failed to retrieve game' });
  }
});

// POST /api/games - Create a new game
router.post('/', async (req, res) => {
  try {
    const { teamId, gameType, gameDate, lineup, opponentTeamName, opponentRoster } = req.body;

    const submittedType = normalizeGameType(gameType);
    if (!submittedType) {
      return res.status(400).json({ error: 'Invalid game type' });
    }

    const parsedDate = new Date(gameDate);
    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: 'Invalid game date' });
    }

    if (!isValidLineup(lineup)) {
      return res.status(400).json({ error: 'Lineup must have exactly 15 players with unique slots 1-15' });
    }

    if (typeof opponentTeamName !== 'string' || opponentTeamName.trim().length === 0) {
      return res.status(400).json({ error: 'Opponent team name is required' });
    }

    if (!isValidOpponentRoster(opponentRoster)) {
      return res.status(400).json({ error: 'Opponent roster must have exactly 15 players (number + name)' });
    }

    const gameData = {
      teamId: new mongoose.Types.ObjectId(teamId),
      gameType: submittedType,
      gameDate: parsedDate,
      lineup: lineup.map((entry: any) => ({
        playerId: new mongoose.Types.ObjectId(entry.playerId),
        slot: Number(entry.slot)
      })),
      opponent: {
        teamName: opponentTeamName.trim(),
        roster: opponentRoster.map((p: any) => ({
          number: Number(p.number),
          name: String(p.name).trim()
        }))
      },
      status: 'scheduled' as const,
      score: { us: 0, them: 0 },
      dateCreated: new Date()
    };

    const newGame = new Game(gameData);
    await newGame.save();
    res.status(201).json(newGame);
  } catch (err) {
    console.error('Error creating game:', err);
    res.status(500).json({ error: 'Failed to create game' });
  }
});

// PUT /api/games/:id/score - Update game score
router.put('/:id/score', async (req, res) => {
  try {
    const { us, them } = req.body;

    if (!Number.isFinite(us) || us < 0 || !Number.isFinite(them) || them < 0) {
      return res.status(400).json({ error: 'Invalid score values' });
    }

    const updatedGame = await Game.findByIdAndUpdate(
      req.params.id,
      {
        score: { us, them },
        status: 'in-progress',
        dateUpdated: new Date()
      },
      { new: true }
    );

    if (!updatedGame) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.json(updatedGame);
  } catch (err) {
    console.error('Error updating score:', err);
    res.status(500).json({ error: 'Failed to update score' });
  }
});

// PUT /api/games/:id/finish - Finish a game
router.put('/:id/finish', async (req, res) => {
  try {
    const { us, them } = req.body;

    if (!Number.isFinite(us) || us < 0 || !Number.isFinite(them) || them < 0) {
      return res.status(400).json({ error: 'Invalid score values' });
    }

    let result: string;
    if (us > them) result = 'Win';
    else if (them > us) result = 'Loss';
    else result = 'Tie';

    const finishedGame = await Game.findByIdAndUpdate(
      req.params.id,
      {
        score: { us, them },
        result,
        status: 'finished',
        dateUpdated: new Date()
      },
      { new: true }
    );

    if (!finishedGame) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.json({
      message: 'Game finished and saved to history',
      game: finishedGame
    });
  } catch (err) {
    console.error('Error finishing game:', err);
    res.status(500).json({ error: 'Failed to finish game' });
  }
});

// PUT /api/games/:id - Update game info
router.put('/:id', async (req, res) => {
  try {
    const update: any = {};

    if (typeof req.body.gameType !== 'undefined') {
      const type = normalizeGameType(req.body.gameType);
      if (!type) return res.status(400).json({ error: 'Invalid game type' });
      update.gameType = type;
    }

    if (typeof req.body.gameDate !== 'undefined') {
      const gameDate = new Date(req.body.gameDate);
      if (Number.isNaN(gameDate.getTime())) return res.status(400).json({ error: 'Invalid game date' });
      update.gameDate = gameDate;
    }

    if (typeof req.body.lineup !== 'undefined') {
      if (!isValidLineup(req.body.lineup)) {
        return res.status(400).json({ error: 'Lineup must have exactly 15 players with unique slots 1-15' });
      }
      update.lineup = req.body.lineup.map((entry: any) => ({
        playerId: new mongoose.Types.ObjectId(entry.playerId),
        slot: Number(entry.slot)
      }));
    }

    if (typeof req.body.opponentTeamName !== 'undefined') {
      if (typeof req.body.opponentTeamName !== 'string' || req.body.opponentTeamName.trim().length === 0) {
        return res.status(400).json({ error: 'Invalid opponent team name' });
      }
      update['opponent.teamName'] = req.body.opponentTeamName.trim();
    }

    if (typeof req.body.opponentRoster !== 'undefined') {
      if (!isValidOpponentRoster(req.body.opponentRoster)) {
        return res.status(400).json({ error: 'Opponent roster must have exactly 15 players (number + name)' });
      }
      update['opponent.roster'] = req.body.opponentRoster.map((p: any) => ({
        number: Number(p.number),
        name: String(p.name).trim()
      }));
    }

    update.dateUpdated = new Date();

    const updatedGame = await Game.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    );

    if (!updatedGame) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.json(updatedGame);
  } catch (err) {
    console.error('Error updating game info:', err);
    res.status(500).json({ error: 'Failed to update game info' });
  }
});

// DELETE /api/games/:id - Delete a game
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Game.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.json({ message: 'Game deleted successfully' });
  } catch (err) {
    console.error('Error deleting game:', err);
    res.status(500).json({ error: 'Failed to delete game' });
  }
});

// DELETE /api/games - Delete all games (optionally filtered by teamId)
router.delete('/', async (req, res) => {
  try {
    const filter: any = {};
    if (typeof req.query.teamId === 'string' && req.query.teamId.trim().length > 0) {
      filter.teamId = req.query.teamId.trim();
    }

    await Game.deleteMany(filter);
    res.json({ message: 'Games deleted successfully' });
  } catch (err) {
    console.error('Error deleting all games:', err);
    res.status(500).json({ error: 'Failed to delete games' });
  }
});

export default router;
