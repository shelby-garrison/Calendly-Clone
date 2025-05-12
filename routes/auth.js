const express = require('express');
const passport = require('passport');
const { isAuthenticated, isNotAuthenticated } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// Login page
router.get('/login', isNotAuthenticated, (req, res) => {
  res.render('auth/login');
});

// Google OAuth routes
router.get('/google',
  passport.authenticate('google', {
    scope: [
      'openid',
      'profile',
      'email',
      'https://www.googleapis.com/auth/calendar'
    ],
    accessType: 'offline',
    prompt: 'consent',
    includeGrantedScopes: true
  })
);

router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/auth/login'
  }),
  (req, res) => {
    res.redirect('/dashboard');
  }
);

// Force Google account reconnection
router.get('/google/reconnect', isAuthenticated, async (req, res) => {
  try {
    // Clear existing Google account data
    const user = await User.findById(req.user.id);
    user.googleAccounts = [];
    await user.save();

    // Redirect to Google OAuth
    res.redirect('/auth/google');
  } catch (error) {
    console.error('Error reconnecting Google account:', error);
    res.redirect('/dashboard');
  }
});

// Logout route
router.get('/logout', isAuthenticated, (req, res) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect('/auth/login');
  });
});

module.exports = router; 