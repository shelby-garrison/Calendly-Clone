const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MeetingSchema = new Schema({
  schedulingLink: {
    type: Schema.Types.ObjectId,
    ref: 'SchedulingLink',
    required: true
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  attendeeEmail: {
    type: String,
    required: true
  },
  attendeeLinkedIn: String,
  customAnswers: [{
    question: String,
    answer: String,
    augmentedAnswer: String
  }],
  hubspotContactId: String,
  linkedinData: {
    summary: String,
    experience: String,
    education: String
  },
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Meeting', MeetingSchema); 