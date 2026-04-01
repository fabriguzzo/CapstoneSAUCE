const bcrypt = require('bcrypt');
const userDao = require('../model/userDao');
const teamDao = require('../model/teamDao');
const playerDao = require('../model/playerDao');
const emailService = require('../services/emailService');

const SALT_ROUNDS = 12;

exports.getProfile = async function (req, res) {
  try {
    const user = await userDao.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

exports.updateProfile = async function (req, res) {
  try {
    const { name, email, password } = req.body;
    const update = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Name cannot be empty' });
      }
      update.name = name.trim();
    }

    if (email !== undefined) {
      const normalizedEmail = email.toLowerCase().trim();
      const existing = await userDao.findByEmail(normalizedEmail);
      if (existing && existing._id.toString() !== req.user.id) {
        return res.status(400).json({ error: 'Email already in use by another account' });
      }
      update.email = normalizedEmail;
    }

    if (password !== undefined) {
      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }
      update.password = await bcrypt.hash(password, SALT_ROUNDS);
    }

    if (req.file) {
      update.profilePicture = `/uploads/profiles/${req.file.filename}`;
    }

    const updated = await userDao.updateProfile(req.user.id, update);
    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(updated);
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

exports.getPendingMembers = async function (req, res) {
  try {
    const members = await userDao.findByTeamAndStatus(req.user.teamId, 'pending');
    res.json(members);
  } catch (err) {
    console.error('Get pending members error:', err);
    res.status(500).json({ error: 'Failed to fetch pending members' });
  }
};

exports.getTeamMembers = async function (req, res) {
  try {
    const members = await userDao.findByTeam(req.user.teamId);
    res.json(members);
  } catch (err) {
    console.error('Get team members error:', err);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
};

exports.approveMember = async function (req, res) {
  try {
    const userId = req.params.userId;
    const user = await userDao.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.teamId.toString() !== req.user.teamId) {
      return res.status(403).json({ error: 'You can only manage members of your own team' });
    }

    let updated = await userDao.updateStatus(userId, 'approved');

    const matchingPlayers = await playerDao.findByTeamAndName(updated.teamId, updated.name) || [];
    if (!updated.playerId && matchingPlayers.length === 1) {
      updated = await userDao.updatePlayerLink(userId, matchingPlayers[0]._id);
    }

    try {
      const team = await teamDao.read(req.user.teamId);
      if (team) {
        await emailService.sendApprovalNotificationEmail(updated.email, team.name);
      }
    } catch (emailErr) {
      console.error('Failed to send approval email:', emailErr);
      // Don't fail the approval if email fails
    }

    res.json(updated);
  } catch (err) {
    console.error('Approve member error:', err);
    res.status(500).json({ error: 'Failed to approve member' });
  }
};

exports.rejectMember = async function (req, res) {
  try {
    const userId = req.params.userId;
    const user = await userDao.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.teamId.toString() !== req.user.teamId) {
      return res.status(403).json({ error: 'You can only manage members of your own team' });
    }

    await userDao.deleteOne(userId);
    res.json({ message: 'Member request rejected' });
  } catch (err) {
    console.error('Reject member error:', err);
    res.status(500).json({ error: 'Failed to reject member' });
  }
};

exports.removeMember = async function (req, res) {
  try {
    const userId = req.params.userId;
    const user = await userDao.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.teamId.toString() !== req.user.teamId) {
      return res.status(403).json({ error: 'You can only manage members of your own team' });
    }

    if (user.role === 'coach') {
      return res.status(400).json({ error: 'Cannot remove the coach from the team' });
    }

    await userDao.deleteOne(userId);
    res.json({ message: 'Member removed from team' });
  } catch (err) {
    console.error('Remove member error:', err);
    res.status(500).json({ error: 'Failed to remove member' });
  }
};
