const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
  email: { type: String, required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}, {
  timestamps: true
});

const Feedback = mongoose.model('Feedback', FeedbackSchema);

exports.create = async (data) => {
  const feedback = new Feedback(data);
  return await feedback.save();
};

exports.readAll = async (filter = {}) => {
  return await Feedback.find(filter).sort({ timestamp: -1 }).lean();
};

exports.read = async (id) => {
  return await Feedback.findById(id).lean();
};

exports.deleteAll = async (filter = {}) => {
  return await Feedback.deleteMany(filter);
};
