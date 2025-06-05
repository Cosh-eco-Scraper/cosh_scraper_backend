import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';

dotenv.config();
const ai = new GoogleGenAI({ apiKey: process.env.AI_API_KEY });

const sendPrompt = async (prompt: string): Promise<string | undefined> => {
  // The minDelay from your original code is still useful as a general rate limit
  // but the specific retryDelay from the API error is more precise for 429s.
  const maxRPM = 10; // This is your self-imposed rate limit
  const minDelay = Math.ceil(60000 / maxRPM);
  let backOffAmount = 1;
  let backOffTime = 1000;

  console.log(`[AI] waiting for ${minDelay}ms before sending prompt.`);
  await new Promise((resolve) => setTimeout(resolve, minDelay));

  let retry: boolean = true;

  while (retry) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-lite',
        config: {
          temperature: 0.2,
        },
        contents: prompt,
      });

      retry = false;
      return response.text;
    } catch (error) {
      if (error instanceof Error) {
        console.error('[AI] Error:', error.message);

        // Attempt to parse retryDelay from the error message
        const errorDetailsMatch = error.message.match(/"retryDelay":"(\d+)s"/);
        let specificRetryDelay = 0;
        if (errorDetailsMatch && errorDetailsMatch[1]) {
          specificRetryDelay = parseInt(errorDetailsMatch[1], 10) * 1000; // Convert to milliseconds
          console.log(`[AI] API requested retry after: ${specificRetryDelay}ms`);
        }

        const currentDelay =
          specificRetryDelay > 0 ? specificRetryDelay : backOffTime * Math.pow(2, backOffAmount);
        console.log(`[AI] Backing off for: ${currentDelay}ms`);

        await new Promise((resolve) => setTimeout(resolve, currentDelay));

        // Increase backOffAmount for next retry if API didn't provide a specific delay
        if (specificRetryDelay === 0) {
          backOffAmount++;
          // Optional: Cap the backOffAmount or backOffTime to prevent extremely long delays
          // backOffTime = Math.min(backOffTime * 2, MAX_BACKOFF_TIME);
        }
      }
      retry = true;
    }
  }
};


const descriptionGenerator = async (prompt: string): Promise<string | undefined> => {
  const response = await ai.models.generateContent({
    config: {
      temperature: 0.2,
    },
    model: 'gemini-2.0-flash',
    contents: prompt,
  });
  console.log(response.text);

  return response.text;
};

const descriptionCheck = async (description: string): Promise<string | undefined> => {
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    config: {
      temperature: 0.2,
    },
    contents:
      'Give me only Yes, it does comply or No, It does not comply for an answer. can you check if this description complies to the European and Belgian guidelines for greeNwashing:' +
      description,
  });
  console.log(response.text);

  return response.text;
};
export const LLMService = {
  sendPrompt,
  descriptionCheck,
  descriptionGenerator,
};
