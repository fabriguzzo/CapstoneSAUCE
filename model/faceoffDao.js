const mongoose = require('mongoose');

const FaceoffSchema = new mongoose.Schema(
  {
    gameId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    teamId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },

    homePlayerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    homePlayerName: { type: String, required: true },
    homePlayerNumber: { type: Number, required: true },

    awayPlayerName: { type: String, required: true },
    awayPlayerNumber: { type: Number, required: true },

    winner: { type: String, enum: ['home', 'away'], required: true },

    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

FaceoffSchema.index({ gameId: 1, timestamp: 1 });

const Faceoff = mongoose.model('Faceoff', FaceoffSchema);

exports.create = async (data) => {
  const faceoff = new Faceoff(data);
  return await faceoff.save();
};

exports.getByGame = async (gameId) => {
  return await Faceoff.find({ gameId }).sort({ timestamp: -1 }).lean();
};

exports.deleteLast = async (gameId) => {
  const last = await Faceoff.findOne({ gameId }).sort({ timestamp: -1 });
  if (!last) return null;
  return await Faceoff.findByIdAndDelete(last._id).lean();
};

exports.deleteAll = async (filter = {}) => {
  return await Faceoff.deleteMany(filter);
};

exports.Faceoff = Faceoff;
