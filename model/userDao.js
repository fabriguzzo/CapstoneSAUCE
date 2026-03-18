const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  profilePicture: { type: String },
  role: { type: String, required: true, enum: ['coach', 'member'] },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  status: { type: String, enum: ['pending', 'approved'], default: 'pending' },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date }
}, {
  timestamps: true
});

UserSchema.index({ teamId: 1, status: 1 });

const User = mongoose.model('User', UserSchema);

exports.create = async (data) => {
  const user = new User(data);
  return await user.save();
};

exports.findByEmail = async (email) => {
  return await User.findOne({ email: email.toLowerCase() });
};

exports.findById = async (id) => {
  return await User.findById(id).select('-password -resetPasswordToken -resetPasswordExpires');
};

exports.findByIdWithPassword = async (id) => {
  return await User.findById(id);
};

exports.findByTeamAndStatus = async (teamId, status) => {
  return await User.find({ teamId, status })
    .select('-password -resetPasswordToken -resetPasswordExpires')
    .sort({ createdAt: -1 })
    .lean();
};

exports.findByTeam = async (teamId) => {
  return await User.find({ teamId, status: 'approved' })
    .select('-password -resetPasswordToken -resetPasswordExpires')
    .sort({ name: 1 })
    .lean();
};

exports.findCoachByTeam = async (teamId) => {
  return await User.findOne({ teamId, role: 'coach' })
    .select('-password -resetPasswordToken -resetPasswordExpires');
};

exports.updateProfile = async (id, updateData) => {
  return await User.findByIdAndUpdate(id, updateData, { new: true })
    .select('-password -resetPasswordToken -resetPasswordExpires');
};

exports.setResetToken = async (id, token, expires) => {
  return await User.findByIdAndUpdate(id, {
    resetPasswordToken: token,
    resetPasswordExpires: expires
  });
};

exports.findByResetToken = async (tokenHash) => {
  return await User.findOne({
    resetPasswordToken: tokenHash,
    resetPasswordExpires: { $gt: Date.now() }
  });
};

exports.updatePassword = async (id, hashedPassword) => {
  return await User.findByIdAndUpdate(id, {
    password: hashedPassword,
    resetPasswordToken: undefined,
    resetPasswordExpires: undefined
  });
};

exports.updateStatus = async (id, status) => {
  return await User.findByIdAndUpdate(id, { status }, { new: true })
    .select('-password -resetPasswordToken -resetPasswordExpires');
};

exports.deleteOne = async (id) => {
  return await User.findByIdAndDelete(id);
};
