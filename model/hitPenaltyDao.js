const mongoose = require('mongoose');

const HitPenaltySchema = new mongoose.Schema(
  {
    gameId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    teamId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },

    playerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    playerName: { type: String, required: true },
    playerNumber: { type: Number, required: true },

    type: { type: String, enum: ['hit', 'penalty'], required: true },

    // Only used for penalties
    penaltyMinutes: { type: Number, default: 0, min: 0 },

    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

HitPenaltySchema.index({ gameId: 1, timestamp: 1 });

const HitPenalty = mongoose.model('HitPenalty', HitPenaltySchema);

exports.create = async (data) => {
  const doc = new HitPenalty(data);
  return await doc.save();
};

exports.getByGame = async (gameId) => {
  return await HitPenalty.find({ gameId }).sort({ timestamp: -1 }).lean();
};

exports.deleteLast = async (gameId) => {
  const last = await HitPenalty.findOne({ gameId }).sort({ timestamp: -1 });
  if (!last) return null;
  return await HitPenalty.findByIdAndDelete(last._id).lean();
};

exports.deleteAll = async (filter = {}) => {
  return await HitPenalty.deleteMany(filter);
};

exports.HitPenalty = HitPenalty;
