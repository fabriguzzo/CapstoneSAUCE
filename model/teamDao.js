const mongoose = require('mongoose');

const TeamSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  coach: { type: String },
  description: { type: String }
}, {
  timestamps: true
});

const Team = mongoose.model('Team', TeamSchema);

exports.create = async (data) => {
  const team = new Team(data);
  return await team.save();
};

exports.readAll = async (filter = {}) => {
  return await Team.find(filter).sort({ name: 1 }).lean();
};

exports.read = async (id) => {
  return await Team.findById(id).lean();
};

exports.update = async (id, updateData) => {
  return await Team.findByIdAndUpdate(id, updateData, { new: true }).lean();
};

exports.del = async (id) => {
  return await Team.findByIdAndDelete(id).lean();
};

exports.deleteAll = async (filter = {}) => {
  return await Team.deleteMany(filter);
};
