const bcrypt = require('bcrypt');
const crypto = require('crypto');
const passport = require('../middleware/passport');
const userDao = require('../model/userDao');
const teamDao = require('../model/teamDao');
const { generateToken } = require('../middleware/auth');
const emailService = require('../services/emailService');

const SALT_ROUNDS = 12;

exports.register = async function (req, res) {
  try {
    const { email, password, name, role, teamId, teamName } = req.body;

    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'Email, password, name, and role are required' });
    }

    if (!['coach', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Role must be "coach" or "member"' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existing = await userDao.findByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    let userTeamId;
    let status;

    if (role === 'coach') {
      if (!teamName || teamName.trim().length === 0) {
        return res.status(400).json({ error: 'Team name is required for coach registration' });
      }
      const newTeam = await teamDao.create({ name: teamName.trim(), coach: name });
      userTeamId = newTeam._id;
      status = 'approved';
    } else {
      if (!teamId) {
        return res.status(400).json({ error: 'Team selection is required for member registration' });
      }
      const team = await teamDao.read(teamId);
      if (!team) {
        return res.status(400).json({ error: 'Selected team does not exist' });
      }
      userTeamId = teamId;
      status = 'pending';
    }

    const user = await userDao.create({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      name: name.trim(),
      role,
      teamId: userTeamId,
      status
    });

    const token = generateToken(user);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        teamId: user.teamId,
        status: user.status
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    if (err.code === 11000) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
};

exports.login = function (req, res, next) {
  passport.authenticate('local', { session: false }, (err, user, info) => {
    if (err) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Login failed' });
    }
    if (!user) {
      return res.status(401).json({ error: info?.message || 'Invalid email or password' });
    }

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        teamId: user.teamId,
        status: user.status,
        profilePicture: user.profilePicture
      }
    });
  })(req, res, next);
};

exports.getMe = async function (req, res) {
  try {
    const user = await userDao.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      teamId: user.teamId,
      status: user.status,
      profilePicture: user.profilePicture
    });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

exports.forgotPassword = async function (req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await userDao.findByEmail(email);
    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await userDao.setResetToken(user._id, tokenHash, expires);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

    await emailService.sendPasswordResetEmail(user.email, resetUrl);

    res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
};

exports.resetPassword = async function (req, res) {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await userDao.findByResetToken(tokenHash);

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await userDao.updatePassword(user._id, hashedPassword);

    res.json({ message: 'Password has been reset successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};
