const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  displayName: String,
  googleAccounts: [{
    accessToken: String,
    refreshToken: String,
    email: String,
    calendarId: String
  }],
  hubspotAccount: {
    accessToken: String,
    refreshToken: String,
    expiresAt: Date
  },
  schedulingWindows: [{
    type: Schema.Types.ObjectId,
    ref: 'SchedulingWindow'
  }],
  schedulingLinks: [{
    type: Schema.Types.ObjectId,
    ref: 'SchedulingLink'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', UserSchema); 