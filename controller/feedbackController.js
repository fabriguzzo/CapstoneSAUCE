const dao = require('../model/feedbackDao.js');

exports.getAll = async function (req, res) {
  try {
    const feedback = await dao.readAll();
    res.status(200).json(feedback);
  } catch (err) {
    console.error('Error fetching feedback:', err);
    res.status(500).json({ error: 'Failed to retrieve feedback' });
  }
};

exports.create = async function (req, res) {
  try {
    const { email, subject, message, timestamp } = req.body;

    if (!email || !subject || !message) {
      return res.status(400).json({ error: 'Email, subject, and message are required' });
    }

    const feedbackData = {
      email,
      subject,
      message,
      timestamp: timestamp || new Date()
    };

    await dao.create(feedbackData);
    res.status(200).json({ message: 'Feedback saved successfully' });
  } catch (err) {
    console.error('Error saving feedback:', err);
    res.status(500).json({ error: 'Failed to save feedback' });
  }
};
