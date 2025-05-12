const express = require('express');
const { isAuthenticated } = require('../middleware/auth');
const GoogleCalendarService = require('../services/googleCalendar');
const User = require('../models/User');
const SchedulingWindow = require('../models/SchedulingWindow');

const router = express.Router();

// Get user's calendars
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const calendars = user.googleAccounts.map(account => ({
      email: account.email,
      calendarId: account.calendarId
    }));
    res.json(calendars);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching calendars' });
  }
});

// Add new Google account
router.post('/add-account', isAuthenticated, async (req, res) => {
  try {
    const { accessToken, refreshToken, email, calendarId } = req.body;
    const user = await User.findById(req.user.id);

    const existingAccount = user.googleAccounts.find(acc => acc.email === email);
    if (existingAccount) {
      existingAccount.accessToken = accessToken;
      existingAccount.refreshToken = refreshToken;
      existingAccount.calendarId = calendarId;
    } else {
      user.googleAccounts.push({
        accessToken,
        refreshToken,
        email,
        calendarId
      });
    }

    await user.save();
    res.json({ message: 'Google account added successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error adding Google account' });
  }
});

// Get available time slots
router.get('/available-slots', async (req, res) => {
  try {
    const { calendarId, startDate, endDate, duration, schedulingWindowId } = req.query;

    if (!calendarId || !startDate || !endDate || !duration || !schedulingWindowId) {
      console.error('Missing parameters:', { calendarId, startDate, endDate, duration, schedulingWindowId });
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    let user;
    if (req.isAuthenticated()) {
      user = await User.findById(req.user.id);
    } else {
      // For public access, find user by calendarId
      user = await User.findOne({ 'googleAccounts.calendarId': calendarId });
    }

    if (!user) {
      console.error('User not found for calendarId:', calendarId);
      return res.status(404).json({ error: 'Calendar not found' });
    }

    const googleAccount = user.googleAccounts.find(acc => acc.calendarId === calendarId);
    if (!googleAccount) {
      console.error('Google account not found for calendarId:', calendarId);
      return res.status(404).json({ error: 'Calendar not found' });
    }

    // Debug log the full Google account data
    console.log('Google account data:', {
      email: googleAccount.email,
      hasAccessToken: !!googleAccount.accessToken,
      hasRefreshToken: !!googleAccount.refreshToken,
      calendarId: googleAccount.calendarId,
      accessTokenLength: googleAccount.accessToken?.length,
      refreshTokenLength: googleAccount.refreshToken?.length
    });

    if (!googleAccount.refreshToken) {
      return res.status(401).json({ 
        error: 'Google Calendar access not properly configured. Please reconnect your Google account.',
        requiresReconnect: true
      });
    }

    // Get scheduling window time slots
    const schedulingWindow = await SchedulingWindow.findById(schedulingWindowId);
    if (!schedulingWindow) {
      return res.status(404).json({ error: 'Scheduling window not found' });
    }

    const calendarService = new GoogleCalendarService(
      googleAccount.accessToken,
      googleAccount.refreshToken
    );

    console.log('Fetching available slots with params:', {
      calendarId,
      startDate,
      endDate,
      duration,
      schedulingWindowId
    });

    const slots = await calendarService.getAvailableTimeSlots(
      calendarId,
      new Date(startDate),
      new Date(endDate),
      parseInt(duration),
      schedulingWindow.timeSlots
    );

    console.log('Successfully fetched slots:', slots.length);
    res.json(slots);
  } catch (error) {
    console.error('Error fetching available slots:', {
      error: error.message,
      code: error.code,
      stack: error.stack
    });
    if (error.code === 401) {
      return res.status(401).json({ 
        error: 'Calendar access token expired. Please reconnect your Google Calendar account.',
        requiresReconnect: true
      });
    }
    res.status(500).json({ error: 'Failed to fetch available time slots' });
  }
});

// Create calendar event
router.post('/events', isAuthenticated, async (req, res) => {
  try {
    const { calendarId, event } = req.body;
    const user = await User.findById(req.user.id);
    const account = user.googleAccounts.find(acc => acc.calendarId === calendarId);

    if (!account) {
      return res.status(404).json({ error: 'Calendar not found' });
    }

    const calendarService = new GoogleCalendarService(
      account.accessToken,
      account.refreshToken
    );

    const createdEvent = await calendarService.createEvent(calendarId, event);
    res.json(createdEvent);
  } catch (error) {
    res.status(500).json({ error: 'Error creating calendar event' });
  }
});

module.exports = router; 