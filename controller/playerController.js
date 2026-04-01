const dao = require('../model/playerDao.js');
const userDao = require('../model/userDao');

function normalizeName(value) {
  return String(value || '').trim().toLowerCase();
}

exports.create = async function (req, res) {
  try {
    const { name, number, teamId, position } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Player name is required' });
    }

    if (!Number.isInteger(Number(number)) || Number(number) < 1) {
      return res.status(400).json({ error: 'Player number must be a positive integer' });
    }

    if (!teamId) {
      return res.status(400).json({ error: 'Team ID is required' });
    }

    const playerData = {
      name: name.trim(),
      number: Number(number),
      teamId: teamId,
      position: position?.trim()
    };

    const newPlayer = await dao.create(playerData);
    res.status(201).json(newPlayer);
  } catch (err) {
    console.error('Error creating player:', err);
    res.status(500).json({ error: 'Failed to create player' });
  }
};

exports.getAll = async function (req, res) {
  try {
    const filter = {};
    const shouldFilterToPlayersWithAccounts = req.query.hasAccount === 'true';

    if (req.query.teamId) {
      filter.teamId = req.query.teamId;
    }

    const players = await dao.readAll(filter);

    if (!shouldFilterToPlayersWithAccounts || !filter.teamId) {
      return res.status(200).json(players);
    }

    const approvedMembers = await userDao.findApprovedMembersByTeam(filter.teamId);
    const linkedPlayerIds = new Set(
      approvedMembers
        .map((member) => member.playerId?.toString())
        .filter(Boolean)
    );
    const memberNames = new Set(
      approvedMembers
        .map((member) => normalizeName(member.name))
        .filter(Boolean)
    );

    const playersWithAccounts = players.filter((player) => (
      linkedPlayerIds.has(player._id.toString()) || memberNames.has(normalizeName(player.name))
    ));
    res.status(200).json(playersWithAccounts);
  } catch (err) {
    console.error('Error fetching players:', err);
    res.status(500).json({ error: 'Failed to retrieve players' });
  }
};

exports.getOne = async function (req, res) {
  try {
    const id = req.params.id;
    const player = await dao.read(id);

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    res.status(200).json(player);
  } catch (err) {
    console.error('Error fetching player:', err);
    res.status(500).json({ error: 'Failed to retrieve player' });
  }
};

exports.update = async function (req, res) {
  try {
    const id = req.params.id;
    const { name, number, teamId, position } = req.body;
    const update = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Invalid player name' });
      }
      update.name = name.trim();
    }

    if (number !== undefined) {
      if (!Number.isInteger(Number(number)) || Number(number) < 1) {
        return res.status(400).json({ error: 'Player number must be a positive integer' });
      }
      update.number = Number(number);
    }

    if (position !== undefined) {
      update.position = position.trim();
    }

    if (teamId !== undefined) {
      update.teamId = teamId;
    }

    const updatedPlayer = await dao.update(id, update);

    if (!updatedPlayer) {
      return res.status(404).json({ error: 'Player not found' });
    }

    res.status(200).json(updatedPlayer);
  } catch (err) {
    console.error('Error updating player:', err);
    res.status(500).json({ error: 'Failed to update player' });
  }
};

exports.deleteOne = async function (req, res) {
  try {
    const id = req.params.id;
    const deleted = await dao.del(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Player not found' });
    }

    res.status(200).json({ message: 'Player deleted successfully' });
  } catch (err) {
    console.error('Error deleting player:', err);
    res.status(500).json({ error: 'Failed to delete player' });
  }
};

exports.deleteAll = async function (req, res) {
  try {
    const filter = {};
    if (req.query.teamId) {
      filter.teamId = req.query.teamId;
    }

    await dao.deleteAll(filter);
    res.status(200).json({ message: 'Players deleted successfully' });
  } catch (err) {
    console.error('Error deleting all players:', err);
    res.status(500).json({ error: 'Failed to delete players' });
  }
};
