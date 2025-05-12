const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');

class GoogleCalendarService {
  constructor(accessToken, refreshToken) {
    if (!accessToken || !refreshToken) {
      console.error('Missing tokens:', { hasAccessToken: !!accessToken, hasRefreshToken: !!refreshToken });
      throw new Error('Access token and refresh token are required');
    }

    this.oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    });
    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  async refreshAccessToken() {
    try {
      console.log('Refreshing access token...');
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      this.oauth2Client.setCredentials(credentials);
      this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      console.log('Access token refreshed successfully');
      return credentials;
    } catch (error) {
      console.error('Error refreshing access token:', {
        error: error.message,
        code: error.code,
        stack: error.stack
      });
      throw error;
    }
  }

  async getEvents(calendarId, timeMin, timeMax) {
    try {
      console.log('Fetching events with params:', {
        calendarId,
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString()
      });

      const response = await this.calendar.events.list({
        calendarId,
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });

      console.log('Successfully fetched events:', response.data.items.length);
      return response.data.items;
    } catch (error) {
      console.error('Error fetching calendar events:', {
        error: error.message,
        code: error.code,
        stack: error.stack
      });

      if (error.code === 401) {
        console.log('Token expired, attempting to refresh...');
        await this.refreshAccessToken();
        console.log('Retrying event fetch after token refresh...');
        
        const response = await this.calendar.events.list({
          calendarId,
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          singleEvents: true,
          orderBy: 'startTime'
        });

        console.log('Successfully fetched events after token refresh:', response.data.items.length);
        return response.data.items;
      }
      throw error;
    }
  }

  async createEvent(calendarId, event) {
    try {
      const response = await this.calendar.events.insert({
        calendarId,
        resource: event
      });
      return response.data;
    } catch (error) {
      if (error.code === 401) {
        // Token expired, try refreshing
        await this.refreshAccessToken();
        // Retry the request
        const response = await this.calendar.events.insert({
          calendarId,
          resource: event
        });
        return response.data;
      }
      console.error('Error creating calendar event:', error);
      throw error;
    }
  }

  async getAvailableTimeSlots(calendarId, startDate, endDate, duration, timeSlots) {
    try {
      // Use the exact date received
      const selectedDate = new Date(startDate);
      const selectedWeekday = selectedDate.getDay();
      
      console.log('Received date details:', {
        startDate,
        selectedDate: selectedDate.toISOString(),
        selectedWeekday,
        weekdayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][selectedWeekday],
        date: selectedDate.getDate(),
        month: selectedDate.getMonth(),
        year: selectedDate.getFullYear()
      });

      // Get events for the selected date
      const events = await this.getEvents(calendarId, selectedDate, endDate);
      const busySlots = events.map(event => ({
        start: new Date(event.start.dateTime || event.start.date),
        end: new Date(event.end.dateTime || event.end.date)
      }));

      console.log('Calendar events:', {
        count: events.length,
        busySlots: busySlots.map(slot => ({
          start: slot.start.toISOString(),
          end: slot.end.toISOString(),
          weekday: slot.start.getDay(),
          weekdayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][slot.start.getDay()]
        }))
      });

      const availableSlots = [];

      // Filter time slots for the current weekday
      const windowTimeSlots = timeSlots.filter(slot => {
        const slotWeekday = Number(slot.weekday);
        const match = slotWeekday === selectedWeekday;
        console.log('Weekday comparison:', { 
          slotWeekday,
          slotWeekdayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][slotWeekday],
          selectedWeekday,
          selectedWeekdayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][selectedWeekday],
          slotStartHour: slot.startHour,
          slotEndHour: slot.endHour,
          match
        });
        return match;
      });
      
      if (windowTimeSlots.length === 0) {
        console.log('No time slots defined for this weekday:', selectedWeekday);
        return [];
      }

      // For each window time slot, generate available slots
      for (const windowSlot of windowTimeSlots) {
        // Create a new date object for the start of the day
        let currentTime = new Date(selectedDate);
        currentTime.setHours(windowSlot.startHour, 0, 0, 0);

        console.log('Generating slots for window:', {
          startHour: windowSlot.startHour,
          endHour: windowSlot.endHour,
          currentTime: currentTime.toISOString(),
          weekday: currentTime.getDay(),
          weekdayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][currentTime.getDay()],
          date: currentTime.getDate()
        });

        // Generate slots until we reach the window's end hour
        while (currentTime.getHours() < windowSlot.endHour) {
          const slotEnd = new Date(currentTime.getTime() + duration * 60000);
          
          // Skip if the slot would end after the window's end hour
          if (slotEnd.getHours() > windowSlot.endHour) {
            currentTime = new Date(currentTime.getTime() + 15 * 60000); // Move forward by 15 minutes
            continue;
          }

          // Check if the slot overlaps with any busy slots
          const isSlotAvailable = !busySlots.some(busy => {
            const busyStart = new Date(busy.start);
            const busyEnd = new Date(busy.end);
            const slotStart = new Date(currentTime);
            const slotEndTime = new Date(slotEnd);

            const overlaps = (
              (slotStart >= busyStart && slotStart < busyEnd) ||
              (slotEndTime > busyStart && slotEndTime <= busyEnd) ||
              (slotStart <= busyStart && slotEndTime >= busyEnd)
            );

            if (overlaps) {
              console.log('Slot overlaps with busy slot:', {
                slotStart: slotStart.toISOString(),
                slotEnd: slotEndTime.toISOString(),
                busyStart: busyStart.toISOString(),
                busyEnd: busyEnd.toISOString()
              });
            }

            return overlaps;
          });

          if (isSlotAvailable) {
            // Create new date objects to avoid timezone issues
            const slotStart = new Date(currentTime);
            const slotEndTime = new Date(slotEnd);
            
            // Final verification of the slot
            if (slotStart.getDay() === selectedWeekday && 
                slotStart.getDate() === selectedDate.getDate() &&
                slotStart.getHours() >= windowSlot.startHour && 
                slotEndTime.getHours() <= windowSlot.endHour) {
              availableSlots.push({
                start: slotStart,
                end: slotEndTime
              });
              
              console.log('Added available slot:', {
                start: slotStart.toISOString(),
                end: slotEndTime.toISOString(),
                weekday: slotStart.getDay(),
                weekdayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][slotStart.getDay()],
                date: slotStart.getDate(),
                startHour: slotStart.getHours(),
                endHour: slotEndTime.getHours()
              });
            }
          }

          // Move forward by 15 minutes
          currentTime = new Date(currentTime.getTime() + 15 * 60000);
        }
      }

      // Sort slots by start time
      availableSlots.sort((a, b) => a.start.getTime() - b.start.getTime());

      console.log('Final available slots:', {
        count: availableSlots.length,
        slots: availableSlots.map(slot => ({
          start: slot.start.toISOString(),
          end: slot.end.toISOString(),
          weekday: slot.start.getDay(),
          weekdayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][slot.start.getDay()],
          date: slot.start.getDate(),
          startHour: slot.start.getHours(),
          endHour: slot.end.getHours()
        }))
      });

      return availableSlots;
    } catch (error) {
      console.error('Error getting available time slots:', {
        error: error.message,
        code: error.code,
        stack: error.stack
      });
      throw error;
    }
  }
}

module.exports = GoogleCalendarService; 