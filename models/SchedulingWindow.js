const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SchedulingWindowSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  timeSlots: [{
    weekday: {
      type: Number,
      required: true,
      min: 0,
      max: 6 // 0 = Sunday, 6 = Saturday
    },
    startHour: {
      type: Number,
      required: true,
      min: 0,
      max: 23
    },
    endHour: {
      type: Number,
      required: true,
      min: 0,
      max: 23
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('SchedulingWindow', SchedulingWindowSchema); 