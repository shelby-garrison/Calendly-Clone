const { Configuration, OpenAIApi } = require('openai');

class AIAugmentationService {
  constructor() {
    this.openai = new OpenAIApi(new Configuration({
      apiKey: process.env.OPENAI_API_KEY
    }));
  }

  async augmentResponse(answer, context) {
    try {
      const prompt = `Given the following answer and context, provide an enhanced response that incorporates relevant information from the context:

Answer:
${answer}

Context:
${context}

Please provide an enhanced response that maintains the original answer while adding relevant context. Format the response as:

Original Answer:
[original answer]

Context:
[relevant context from the provided information]

Enhanced Response:
[combined and enhanced response]`;

      const response = await this.openai.createCompletion({
        model: "text-davinci-003",
        prompt,
        max_tokens: 300,
        temperature: 0.7
      });

      return response.data.choices[0].text.trim();
    } catch (error) {
      console.error('Error augmenting response:', error);
      throw error;
    }
  }

  async generateMeetingSummary(meetingData) {
    try {
      const prompt = `Given the following meeting data, generate a concise summary that highlights the key points and any relevant context:

Meeting Details:
${JSON.stringify(meetingData, null, 2)}

Please provide a summary that includes:
1. Key points from the meeting
2. Relevant context from previous interactions
3. Any notable concerns or topics discussed
4. Suggested follow-up actions`;

      const response = await this.openai.createCompletion({
        model: "text-davinci-003",
        prompt,
        max_tokens: 400,
        temperature: 0.7
      });

      return response.data.choices[0].text.trim();
    } catch (error) {
      console.error('Error generating meeting summary:', error);
      throw error;
    }
  }
}

module.exports = AIAugmentationService; 