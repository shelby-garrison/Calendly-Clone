const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'http://localhost:3000/auth/google/callback',
    scope: [
      'openid',
      'profile',
      'email',
      'https://www.googleapis.com/auth/calendar'
    ],
    accessType: 'offline',
    prompt: 'consent',
    includeGrantedScopes: true
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('OAuth callback received:', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        email: profile.emails[0].value
      });

      let user = await User.findOne({ googleId: profile.id });

      if (!user) {
        user = await User.create({
          googleId: profile.id,
          email: profile.emails[0].value,
          displayName: profile.displayName,
          googleAccounts: [{
            accessToken,
            refreshToken,
            email: profile.emails[0].value,
            calendarId: 'primary'
          }]
        });
      } else {
        // Update existing user's Google account info
        const existingAccount = user.googleAccounts.find(acc => acc.email === profile.emails[0].value);
        if (existingAccount) {
          existingAccount.accessToken = accessToken;
          if (refreshToken) { // Only update refresh token if we got a new one
            existingAccount.refreshToken = refreshToken;
          }
        } else {
          user.googleAccounts.push({
            accessToken,
            refreshToken,
            email: profile.emails[0].value,
            calendarId: 'primary'
          });
        }
        await user.save();
      }

      return done(null, user);
    } catch (err) {
      console.error('Error in Google OAuth callback:', err);
      return done(err, null);
    }
  }
)); 