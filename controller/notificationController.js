const notificationDao = require('../model/notificationDao');

exports.getMine = async function (req, res) {
  try {
    const notifications = await notificationDao.readByUserId(req.user.id);
    res.status(200).json(notifications);
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

exports.getUnreadStatus = async function (req, res) {
  try {
    const unreadCount = await notificationDao.countUnreadByUserId(req.user.id);
    res.status(200).json({ unreadCount, hasUnread: unreadCount > 0 });
  } catch (err) {
    console.error('Get unread notification status error:', err);
    res.status(500).json({ error: 'Failed to fetch notification status' });
  }
};

exports.markMineSeen = async function (req, res) {
  try {
    const result = await notificationDao.markAllSeenByUserId(req.user.id);
    res.status(200).json({ message: 'Notifications marked as seen', result });
  } catch (err) {
    console.error('Mark notifications seen error:', err);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
};
