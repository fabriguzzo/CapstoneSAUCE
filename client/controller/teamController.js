const dao = require('../model/teamDao.js');

exports.create = async function (req, res) {
  try {
    const { name, coach, description } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Team name is required' });
    }

    const teamData = {
      name: name.trim(),
      coach: coach?.trim(),
      description: description?.trim()
    };

    const newTeam = await dao.create(teamData);
    res.status(201).json(newTeam);
  } catch (err) {
    console.error('Error creating team:', err);
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Team with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to create team' });
  }
};

exports.getAll = async function (req, res) {
  try {
    const teams = await dao.readAll();
    res.status(200).json(teams);
  } catch (err) {
    console.error('Error fetching teams:', err);
    res.status(500).json({ error: 'Failed to retrieve teams' });
  }
};

exports.getOne = async function (req, res) {
  try {
    const id = req.params.id;
    const team = await dao.read(id);

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.status(200).json(team);
  } catch (err) {
    console.error('Error fetching team:', err);
    res.status(500).json({ error: 'Failed to retrieve team' });
  }
};

exports.update = async function (req, res) {
  try {
    const id = req.params.id;
    const { name, coach, description } = req.body;
    const update = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Invalid team name' });
      }
      update.name = name.trim();
    }

    if (coach !== undefined) {
      update.coach = coach.trim();
    }

    if (description !== undefined) {
      update.description = description.trim();
    }

    const updatedTeam = await dao.update(id, update);

    if (!updatedTeam) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.status(200).json(updatedTeam);
  } catch (err) {
    console.error('Error updating team:', err);
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Team with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to update team' });
  }
};

exports.deleteOne = async function (req, res) {
  try {
    const id = req.params.id;
    const deleted = await dao.del(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.status(200).json({ message: 'Team deleted successfully' });
  } catch (err) {
    console.error('Error deleting team:', err);
    res.status(500).json({ error: 'Failed to delete team' });
  }
};

exports.deleteAll = async function (req, res) {
  try {
    await dao.deleteAll();
    res.status(200).json({ message: 'Teams deleted successfully' });
  } catch (err) {
    console.error('Error deleting all teams:', err);
    res.status(500).json({ error: 'Failed to delete teams' });
  }
};
