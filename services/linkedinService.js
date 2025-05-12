const puppeteer = require('puppeteer');
const OpenAI = require('openai');

class LinkedInService {
  constructor() {
    try {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    } catch (error) {
      console.error('Error initializing OpenAI:', error);
      // Continue without OpenAI integration
      this.openai = null;
    }
  }

  async scrapeProfile(profileUrl) {
    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      await page.goto(profileUrl, { waitUntil: 'networkidle0' });

      const profileData = await page.evaluate(() => {
        return {
          summary: document.querySelector('.pv-shared-text-with-see-more span')?.textContent || '',
          experience: Array.from(document.querySelectorAll('.experience-section .pv-entity__summary-info')).map(exp => ({
            title: exp.querySelector('.pv-entity__name')?.textContent || '',
            company: exp.querySelector('.pv-entity__secondary-title')?.textContent || '',
            duration: exp.querySelector('.pv-entity__date-range span:nth-child(2)')?.textContent || ''
          })),
          education: Array.from(document.querySelectorAll('.education-section .pv-education-entity')).map(edu => ({
            school: edu.querySelector('.pv-entity__school-name')?.textContent || '',
            degree: edu.querySelector('.pv-entity__degree-name span:nth-child(2)')?.textContent || '',
            field: edu.querySelector('.pv-entity__fos span:nth-child(2)')?.textContent || ''
          }))
        };
      });

      await browser.close();
      return profileData;
    } catch (error) {
      console.error('Error scraping LinkedIn profile:', error);
      return null;
    }
  }

  async augmentProfileData(profileData, context) {
    if (!this.openai || !profileData) return null;

    try {
      const prompt = `Given the following LinkedIn profile data and context, provide insights and analysis:

Profile Data:
${JSON.stringify(profileData, null, 2)}

Context: ${context}

Please provide:
1. Key professional strengths
2. Relevant experience for this context
3. Potential areas of interest
4. Suggested conversation topics`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300,
        temperature: 0.7
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error augmenting profile data:', error);
      return null;
    }
  }
}

module.exports = LinkedInService; 