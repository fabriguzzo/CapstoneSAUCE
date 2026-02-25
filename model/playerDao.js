const mongoose = require('mongoose');

const PlayerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  number: { type: Number, required: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, required: true },
  position: { type: String }
}, {
  timestamps: true
});

const Player = mongoose.model('Player', PlayerSchema);

exports.create = async (data) => {
  const player = new Player(data);
  return await player.save();
};

exports.readAll = async (filter = {}) => {
  return await Player.find(filter).sort({ number: 1 }).lean();
};

exports.read = async (id) => {
  return await Player.findById(id).lean();
};

exports.update = async (id, updateData) => {
  return await Player.findByIdAndUpdate(id, updateData, { new: true }).lean();
};

exports.del = async (id) => {
  return await Player.findByIdAndDelete(id).lean();
};

exports.deleteAll = async (filter = {}) => {
  return await Player.deleteMany(filter);
};
