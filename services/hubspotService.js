const hubspot = require('@hubspot/api-client');

class HubspotService {
  constructor(accessToken) {
    this.hubspotClient = new hubspot.Client({ accessToken });
  }

  async findContactByEmail(email) {
    try {
      const response = await this.hubspotClient.crm.contacts.searchApi.doSearch({
        filterGroups: [{
          filters: [{
            propertyName: 'email',
            operator: 'EQ',
            value: email
          }]
        }]
      });

      return response.results[0] || null;
    } catch (error) {
      console.error('Error finding HubSpot contact:', error);
      throw error;
    }
  }

  async createContact(email, properties = {}) {
    try {
      const response = await this.hubspotClient.crm.contacts.basicApi.create({
        properties: {
          email,
          ...properties
        }
      });
      return response;
    } catch (error) {
      console.error('Error creating HubSpot contact:', error);
      throw error;
    }
  }

  async addNoteToContact(contactId, note) {
    try {
      const response = await this.hubspotClient.crm.objects.notes.basicApi.create({
        properties: {
          hs_note_body: note,
          hs_timestamp: new Date().toISOString()
        },
        associations: [{
          to: { id: contactId },
          types: [{
            associationCategory: 'HUBSPOT_DEFINED',
            associationTypeId: 1
          }]
        }]
      });
      return response;
    } catch (error) {
      console.error('Error adding note to HubSpot contact:', error);
      throw error;
    }
  }

  async getContactNotes(contactId) {
    try {
      const response = await this.hubspotClient.crm.objects.notes.searchApi.doSearch({
        filterGroups: [{
          filters: [{
            propertyName: 'associations.contact',
            operator: 'EQ',
            value: contactId
          }]
        }],
        sorts: [{
          propertyName: 'hs_timestamp',
          direction: 'DESCENDING'
        }]
      });
      return response.results;
    } catch (error) {
      console.error('Error getting HubSpot contact notes:', error);
      throw error;
    }
  }
}

module.exports = HubspotService; 