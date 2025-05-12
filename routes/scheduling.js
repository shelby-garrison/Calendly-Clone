const express = require('express');
const { isAuthenticated } = require('../middleware/auth');
const SchedulingWindow = require('../models/SchedulingWindow');
const SchedulingLink = require('../models/SchedulingLink');
const Meeting = require('../models/Meeting');
const GoogleCalendarService = require('../services/googleCalendar');
const HubspotService = require('../services/hubspotService');
const LinkedInService = require('../services/linkedinService');
const AIAugmentationService = require('../utils/aiAugmentation');
const User = require('../models/User');

const router = express.Router();

// Get all scheduling windows
router.get('/windows', isAuthenticated, async (req, res) => {
  try {
    const windows = await SchedulingWindow.find({ user: req.user.id });
    res.json(windows);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching scheduling windows' });
  }
});

// Create scheduling window
router.post('/windows', isAuthenticated, async (req, res) => {
  try {
    const { name, timeSlots } = req.body;
    const window = await SchedulingWindow.create({
      user: req.user.id,
      name,
      timeSlots
    });
    res.json(window);
  } catch (error) {
    res.status(500).json({ error: 'Error creating scheduling window' });
  }
});

// Get all scheduling links
router.get('/links', isAuthenticated, async (req, res) => {
  try {
    const links = await SchedulingLink.find({ user: req.user.id })
      .populate('schedulingWindow');
    res.json(links);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching scheduling links' });
  }
});

// Create scheduling link
router.post('/links', isAuthenticated, async (req, res) => {
  try {
    const {
      name,
      schedulingWindow,
      meetingDuration,
      maxDaysInAdvance,
      maxUses,
      expirationDate,
      customQuestions
    } = req.body;

    // Validate meeting duration
    if (!meetingDuration || meetingDuration < 15 || meetingDuration > 480 || meetingDuration % 15 !== 0) {
      return res.status(400).json({ error: 'Meeting duration must be between 15 and 480 minutes in 15-minute increments' });
    }

    // Validate max days in advance
    if (!maxDaysInAdvance || maxDaysInAdvance < 1 || maxDaysInAdvance > 365) {
      return res.status(400).json({ error: 'Maximum days in advance must be between 1 and 365' });
    }

    // Validate scheduling window exists and belongs to user
    const window = await SchedulingWindow.findOne({ _id: schedulingWindow, user: req.user.id });
    if (!window) {
      return res.status(400).json({ error: 'Invalid scheduling window' });
    }

    // Generate a unique slug
    let slug;
    let isUnique = false;
    while (!isUnique) {
      slug = Math.random().toString(36).substring(2, 15);
      const existingLink = await SchedulingLink.findOne({ slug });
      if (!existingLink) {
        isUnique = true;
      }
    }

    const link = await SchedulingLink.create({
      user: req.user.id,
      name,
      schedulingWindow,
      meetingDuration,
      maxDaysInAdvance,
      maxUses,
      expirationDate,
      customQuestions,
      slug
    });

    res.json(link);
  } catch (error) {
    console.error('Error creating scheduling link:', error);
    res.status(500).json({ error: 'Error creating scheduling link' });
  }
});

// Get scheduling link by slug
router.get('/:slug', async (req, res) => {
  try {
    const link = await SchedulingLink.findOne({ slug: req.params.slug })
      .populate('schedulingWindow')
      .populate('user');
    
    if (!link) {
      return res.status(404).render('error', { 
        message: 'Scheduling link not found',
        error: { status: 404 }
      });
    }

    // Get the user's Google account
    const user = await User.findById(link.user._id);
    if (!user || !user.googleAccounts || user.googleAccounts.length === 0) {
      return res.status(400).render('error', {
        message: 'No Google Calendar account connected',
        error: { status: 400 }
      });
    }

    // Add calendar ID to scheduling window
    link.schedulingWindow.calendarId = user.googleAccounts[0].calendarId;

    res.render('scheduling/link', { 
      link,
      user: req.user // Pass the current user to the template
    });
  } catch (error) {
    console.error('Error fetching scheduling link:', error);
    res.status(500).render('error', { 
      message: 'Error loading scheduling link',
      error: { status: 500 }
    });
  }
});

// Get scheduling window details
router.get('/windows/:id', async (req, res) => {
  try {
    const window = await SchedulingWindow.findById(req.params.id);
    if (!window) {
      return res.status(404).json({ error: 'Scheduling window not found' });
    }
    res.json(window);
  } catch (error) {
    console.error('Error fetching scheduling window:', error);
    res.status(500).json({ error: 'Error fetching scheduling window' });
  }
});

// Schedule meeting
router.post('/schedule', async (req, res) => {
  try {
    const { linkSlug, startTime, endTime, attendeeEmail, attendeeLinkedIn, customAnswers } = req.body;

    console.log('Scheduling request received:', {
      linkSlug,
      startTime,
      endTime,
      attendeeEmail,
      attendeeLinkedIn,
      customAnswers
    });

    // Find the scheduling link
    const link = await SchedulingLink.findOne({ slug: linkSlug })
      .populate('user')
      .populate('schedulingWindow');

    if (!link) {
      console.error('Scheduling link not found:', linkSlug);
      return res.status(404).json({ error: 'Scheduling link not found' });
    }

    // Get the user's Google account and add calendar ID to scheduling window
    const user = await User.findById(link.user._id);
    if (!user || !user.googleAccounts || user.googleAccounts.length === 0) {
      console.error('No Google accounts found for user:', link.user._id);
      return res.status(400).json({ error: 'No Google Calendar account connected' });
    }

    // Add calendar ID to scheduling window
    link.schedulingWindow.calendarId = user.googleAccounts[0].calendarId;

    console.log('Found scheduling link:', {
      linkId: link._id,
      userId: link.user._id,
      windowId: link.schedulingWindow._id,
      calendarId: link.schedulingWindow.calendarId
    });

    // Create the meeting
    const meeting = new Meeting({
      schedulingLink: link._id,
      user: link.user._id,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      attendeeEmail,
      attendeeLinkedIn,
      customAnswers
    });

    console.log('Created meeting object:', {
      meetingId: meeting._id,
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      attendeeEmail: meeting.attendeeEmail
    });

    // Get the user's Google Calendar account
    const googleAccount = user.googleAccounts.find(acc => acc.calendarId === link.schedulingWindow.calendarId);

    if (!googleAccount) {
      console.error('Google account not found:', {
        userId: link.user._id,
        calendarId: link.schedulingWindow.calendarId
      });
      return res.status(400).json({ error: 'Calendar not found' });
    }

    console.log('Found Google account:', {
      email: googleAccount.email,
      hasAccessToken: !!googleAccount.accessToken,
      hasRefreshToken: !!googleAccount.refreshToken,
      calendarId: googleAccount.calendarId
    });

    // Create calendar event
    const calendarService = new GoogleCalendarService(
      googleAccount.accessToken,
      googleAccount.refreshToken
    );

    const event = {
      summary: `${link.name} with ${attendeeEmail}`,
      description: `Meeting scheduled through Calendly Clone\n\nAttendee: ${attendeeEmail}${attendeeLinkedIn ? `\nLinkedIn: ${attendeeLinkedIn}` : ''}\n\nCustom Answers:\n${customAnswers.map(qa => `${qa.question}: ${qa.answer}`).join('\n')}`,
      start: {
        dateTime: new Date(startTime).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: new Date(endTime).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      attendees: [
        { email: attendeeEmail },
        { email: googleAccount.email }
      ]
    };

    console.log('Creating calendar event:', {
      calendarId: link.schedulingWindow.calendarId,
      eventSummary: event.summary,
      startTime: event.start.dateTime,
      endTime: event.end.dateTime,
      timeZone: event.start.timeZone
    });

    try {
      const calendarEvent = await calendarService.createEvent(link.schedulingWindow.calendarId, event);
      console.log('Calendar event created successfully:', {
        eventId: calendarEvent.id,
        htmlLink: calendarEvent.htmlLink
      });
      meeting.calendarEventId = calendarEvent.id;
    } catch (calendarError) {
      console.error('Error creating calendar event:', {
        error: calendarError.message,
        code: calendarError.code,
        stack: calendarError.stack
      });
      throw calendarError;
    }

    // Try to handle HubSpot integration, but don't fail if it doesn't work
    try {
      if (user.hubspotAccount && user.hubspotAccount.accessToken) {
        const hubspotService = new HubspotService(user.hubspotAccount.accessToken);
        let contact = await hubspotService.findContactByEmail(attendeeEmail);

        if (!contact) {
          contact = await hubspotService.createContact(attendeeEmail);
        }

        // Add meeting note
        await hubspotService.addNoteToContact(contact.id, `Scheduled meeting for ${new Date(startTime).toLocaleString()}`);
        meeting.hubspotContactId = contact.id;
      }
    } catch (hubspotError) {
      console.error('HubSpot integration error:', hubspotError);
      // Continue with the meeting creation even if HubSpot fails
    }

    // Handle LinkedIn integration
    if (attendeeLinkedIn) {
      try {
        const linkedinService = new LinkedInService();
        const profileData = await linkedinService.scrapeProfile(attendeeLinkedIn);
        
        if (profileData) {
          const context = `Scheduling a ${meeting.duration} minute meeting with ${attendeeEmail}`;
          const insights = await linkedinService.augmentProfileData(profileData, context);
          
          if (insights) {
            meeting.linkedinInsights = insights;
            await meeting.save();
          }
        }
      } catch (error) {
        console.error('LinkedIn integration error:', error);
        // Continue without LinkedIn insights
      }
    }

    try {
      await meeting.save();
      console.log('Meeting saved successfully:', {
        meetingId: meeting._id,
        calendarEventId: meeting.calendarEventId
      });
      res.json({
        success: true,
        meetingId: meeting._id,
        calendarEventId: calendarEvent.id
      });
    } catch (saveError) {
      console.error('Error saving meeting:', {
        error: saveError.message,
        code: saveError.code,
        stack: saveError.stack
      });
      throw saveError;
    }
  } catch (error) {
    console.error('Error scheduling meeting:', {
      error: error.message,
      code: error.code,
      stack: error.stack
    });
    // Only return error if it's not a LinkedIn integration error
    if (error.message.includes('LinkedIn')) {
      res.json({
        success: true,
        meetingId: meeting._id,
        calendarEventId: meeting.calendarEventId
      });
    } else {
      res.status(500).json({ error: 'Error scheduling meeting' });
    }
  }
});

module.exports = router; 