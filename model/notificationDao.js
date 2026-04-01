const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    recipientUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null, index: true },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    assignedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    statKey: {
      type: String,
      required: true,
      enum: ['goals', 'assists', 'shots', 'hits', 'pim', 'plusMinus', 'saves', 'goalsAgainst'],
    },
    message: { type: String, required: true, trim: true },
    assignedAt: { type: Date, required: true, default: Date.now },
    seen: { type: Boolean, required: true, default: false, index: true },
  },
  { timestamps: true }
);

NotificationSchema.index({ recipientUserId: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', NotificationSchema);

exports.createMany = async (notifications) => {
  if (!notifications.length) return [];
  return Notification.insertMany(notifications);
};

exports.readByUserId = async (recipientUserId) => {
  return Notification.find({ recipientUserId }).sort({ createdAt: -1 }).lean();
};

exports.countUnreadByUserId = async (recipientUserId) => {
  return Notification.countDocuments({ recipientUserId, seen: false });
};

exports.markAllSeenByUserId = async (recipientUserId) => {
  return Notification.updateMany(
    { recipientUserId, seen: false },
    { $set: { seen: true } }
  );
};

exports.Notification = Notification;
