import { Router } from 'express';
import Team from '../models/Team';

const router = Router();

// GET /api/teams - Get all teams
router.get('/', async (req, res) => {
  try {
    const teams = await Team.find().sort({ name: 1 });
    res.json(teams);
  } catch (err) {
    console.error('Error fetching teams:', err);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// GET /api/teams/:id - Get a single team
router.get('/:id', async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    res.json(team);
  } catch (err) {
    console.error('Error fetching team:', err);
    res.status(500).json({ error: 'Failed to fetch team' });
  }
});

// POST /api/teams - Create a new team
router.post('/', async (req, res) => {
  try {
    const { name, coach, description } = req.body;
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Team name is required' });
    }

    const team = new Team({
      name: name.trim(),
      coach: coach?.trim(),
      description: description?.trim()
    });

    await team.save();
    res.status(201).json(team);
  } catch (err: any) {
    console.error('Error creating team:', err);
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Team with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to create team' });
  }
});

// PUT /api/teams/:id - Update a team
router.put('/:id', async (req, res) => {
  try {
    const { name, coach, description } = req.body;
    const update: any = {};
    
    if (name !== undefined) update.name = name.trim();
    if (coach !== undefined) update.coach = coach.trim();
    if (description !== undefined) update.description = description.trim();

    const team = await Team.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    );

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json(team);
  } catch (err: any) {
    console.error('Error updating team:', err);
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Team with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to update team' });
  }
});

// DELETE /api/teams/:id - Delete a team
router.delete('/:id', async (req, res) => {
  try {
    const team = await Team.findByIdAndDelete(req.params.id);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    res.json({ message: 'Team deleted successfully' });
  } catch (err) {
    console.error('Error deleting team:', err);
    res.status(500).json({ error: 'Failed to delete team' });
  }
});

export default router;
