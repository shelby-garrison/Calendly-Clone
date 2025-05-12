const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SchedulingLinkSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  schedulingWindow: {
    type: Schema.Types.ObjectId,
    ref: 'SchedulingWindow',
    required: true
  },
  meetingDuration: {
    type: Number,
    required: true,
    min: 15,
    max: 480 // 8 hours
  },
  maxUses: {
    type: Number,
    min: 1
  },
  expirationDate: Date,
  maxDaysInAdvance: {
    type: Number,
    required: true,
    min: 1,
    max: 365
  },
  customQuestions: [{
    question: {
      type: String,
      required: true
    },
    required: {
      type: Boolean,
      default: false
    }
  }],
  slug: {
    type: String,
    required: true,
    unique: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('SchedulingLink', SchedulingLinkSchema); 