const express = require('express');
const { isAuthenticated } = require('../middleware/auth');
const User = require('../models/User');
const HubspotService = require('../services/hubspotService');

const router = express.Router();

// Connect HubSpot account
router.post('/connect', isAuthenticated, async (req, res) => {
  try {
    const { accessToken, refreshToken, expiresAt } = req.body;
    const user = await User.findById(req.user.id);

    user.hubspotAccount = {
      accessToken,
      refreshToken,
      expiresAt: new Date(expiresAt)
    };

    await user.save();
    res.json({ message: 'HubSpot account connected successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error connecting HubSpot account' });
  }
});

// Get HubSpot contacts
router.get('/contacts', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const hubspotService = new HubspotService(user.hubspotAccount.accessToken);
    
    const contacts = await hubspotService.findContactByEmail(req.query.email);
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching HubSpot contacts' });
  }
});

// Get contact notes
router.get('/contacts/:contactId/notes', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const hubspotService = new HubspotService(user.hubspotAccount.accessToken);
    
    const notes = await hubspotService.getContactNotes(req.params.contactId);
    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching contact notes' });
  }
});

// Add note to contact
router.post('/contacts/:contactId/notes', isAuthenticated, async (req, res) => {
  try {
    const { note } = req.body;
    const user = await User.findById(req.user.id);
    const hubspotService = new HubspotService(user.hubspotAccount.accessToken);
    
    const result = await hubspotService.addNoteToContact(req.params.contactId, note);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Error adding note to contact' });
  }
});

module.exports = router; 