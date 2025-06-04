import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';

dotenv.config();
const ai = new GoogleGenAI({ apiKey: process.env.AI_API_KEY });

const sendPrompt = async (prompt: string): Promise<string | undefined> => {
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
  });
  console.log(response.text);

  return response.text;
};

const descriptionCheck = async (description: string): Promise<string | undefined> => {
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
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
};
