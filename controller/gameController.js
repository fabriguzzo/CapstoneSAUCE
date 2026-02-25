const dao = require('../model/gameDao.js');

function normalizeGameType(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return dao.GAME_TYPES.includes(normalized) ? normalized : null;
}

function isValidOpponentRoster(roster) {
  if (!Array.isArray(roster) || roster.length !== 15) return false;

  return roster.every(p =>
    p &&
    Number.isFinite(Number(p.number)) &&
    typeof p.name === 'string' &&
    p.name.trim().length > 0
  );
}

function isValidLineup(lineup) {
  if (!Array.isArray(lineup) || lineup.length !== 15) return false;

  //slots must be 1..15, unique
  const slots = new Set();
  //playerId must be unique
  const players = new Set();

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

//New game
exports.create = async function (req, res) {
  try {
    const submittedType = normalizeGameType(req.body.gameType);
    if (!submittedType) {
      return res.status(400).json({ error: 'Invalid game type' });
    }

    const gameDate = new Date(req.body.gameDate);
    if (Number.isNaN(gameDate.getTime())) {
      return res.status(400).json({ error: 'Invalid game date' });
    }

    if (!isValidLineup(req.body.lineup)) {
      return res.status(400).json({ error: 'Lineup must have exactly 15 players with unique slots 1-15' });
    }

    if (typeof req.body.opponentTeamName !== 'string' || req.body.opponentTeamName.trim().length === 0) {
      return res.status(400).json({ error: 'Opponent team name is required' });
    }

    if (!isValidOpponentRoster(req.body.opponentRoster)) {
      return res.status(400).json({ error: 'Opponent roster must have exactly 15 players (number + name)' });
    }

    const gameData = {
      teamId: req.body.teamId,
      gameType: submittedType,
      gameDate,

      lineup: req.body.lineup,

      opponent: {
        teamName: req.body.opponentTeamName.trim(),
        roster: req.body.opponentRoster.map(p => ({
          number: Number(p.number),
          name: String(p.name).trim()
        }))
      },

      status: 'scheduled',
      score: { us: 0, them: 0 },
      dateCreated: new Date()
    };

    const newGame = await dao.create(gameData);
    res.status(201).json(newGame);
  } catch (err) {
    console.error('Error creating game:', err);
    res.status(500).json({ error: 'Failed to create game' });
  }
};

//Games History
exports.getAll = async function (req, res) {
  try {
    const filter = {};

    //optional filters
    if (typeof req.query.teamId === 'string' && req.query.teamId.trim().length > 0) {
      filter.teamId = req.query.teamId.trim();
    }

    if (typeof req.query.type !== 'undefined') {
      const requestedType = normalizeGameType(req.query.type);
      if (!requestedType) {
        return res.status(400).json({ error: 'Invalid game type filter' });
      }
      filter.gameType = requestedType;
    }

    const games = await dao.readAll(filter);
    res.status(200).json(games);
  } catch (err) {
    console.error('Error fetching games:', err);
    res.status(500).json({ error: 'Failed to retrieve games' });
  }
};

//Get a specific game
exports.getOne = async function (req, res) {
  try {
    const id = req.params.id;
    const game = await dao.read(id);

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.status(200).json(game);
  } catch (err) {
    console.error('Error fetching game:', err);
    res.status(500).json({ error: 'Failed to retrieve game' });
  }
};

//Update Score
exports.updateScore = async function (req, res) {
  try {
    const id = req.params.id;
    const us = Number(req.body.us);
    const them = Number(req.body.them);

    if (!Number.isFinite(us) || us < 0 || !Number.isFinite(them) || them < 0) {
      return res.status(400).json({ error: 'Invalid score values' });
    }

    const updatedGame = await dao.update(id, {
      score: { us, them },
      status: 'in-progress'
    });

    if (!updatedGame) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.status(200).json(updatedGame);
  } catch (err) {
    console.error('Error updating score:', err);
    res.status(500).json({ error: 'Failed to update score' });
  }
};

//End and Save
exports.finishGame = async function (req, res) {
  try {
    const id = req.params.id;
    const us = Number(req.body.us);
    const them = Number(req.body.them);

    if (!Number.isFinite(us) || us < 0 || !Number.isFinite(them) || them < 0) {
      return res.status(400).json({ error: 'Invalid score values' });
    }

    let result;
    if (us > them) result = 'Win';
    else if (them > us) result = 'Loss';
    else result = 'Tie';

    const finishedGame = await dao.update(id, {
      score: { us, them },
      result,
      status: 'finished',
      dateFinished: new Date()
    });

    if (!finishedGame) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.status(200).json({
      message: 'Game finished and saved to history',
      game: finishedGame
    });
  } catch (err) {
    console.error('Error finishing game:', err);
    res.status(500).json({ error: 'Failed to finish game' });
  }
};

//Update game info (date/type/lineup/opponent)
exports.updateGameInfo = async function (req, res) {
  try {
    const id = req.params.id;
    const update = {};

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
      update.lineup = req.body.lineup;
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
      update['opponent.roster'] = req.body.opponentRoster.map(p => ({
        number: Number(p.number),
        name: String(p.name).trim()
      }));
    }

    const updatedGame = await dao.update(id, update);

    if (!updatedGame) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.status(200).json(updatedGame);
  } catch (err) {
    console.error('Error updating game info:', err);
    res.status(500).json({ error: 'Failed to update game info' });
  }
};

//Remove game
exports.deleteOne = async function (req, res) {
  try {
    const id = req.params.id;
    const deleted = await dao.del(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.status(200).json({ message: 'Game deleted successfully' });
  } catch (err) {
    console.error('Error deleting game:', err);
    res.status(500).json({ error: 'Failed to delete game' });
  }
};

//Remove all games history
exports.deleteAll = async function (req, res) {
  try {
    const filter = {};
    if (typeof req.query.teamId === 'string' && req.query.teamId.trim().length > 0) {
      filter.teamId = req.query.teamId.trim();
    }

    await dao.deleteAll(filter);
    res.status(200).json({ message: 'Games deleted successfully' });
  } catch (err) {
    console.error('Error deleting all games:', err);
    res.status(500).json({ error: 'Failed to delete games' });
  }
};

