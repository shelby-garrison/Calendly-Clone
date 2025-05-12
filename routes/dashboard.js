const express = require('express');
const { isAuthenticated } = require('../middleware/auth');
const SchedulingWindow = require('../models/SchedulingWindow');
const SchedulingLink = require('../models/SchedulingLink');

const router = express.Router();

// Dashboard home
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const windows = await SchedulingWindow.find({ user: req.user.id });
    const links = await SchedulingLink.find({ user: req.user.id })
      .populate('schedulingWindow');

    res.render('dashboard/index', {
      user: req.user,
      windows,
      links,
      getWeekdayName: (weekday) => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[weekday];
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).render('error', { message: 'Error loading dashboard' });
  }
});

module.exports = router; 