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

const descrtiptionCheck = async (description: string): Promise<string | undefined> => {
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents:
      'give me only true or false for answer. can you check if this description complies to the European and Belgian guidelines for greeNwashing:' +
      description,
  });
  console.log(response.text);

  return response.text;
};


export const LLMService = {
  sendPrompt, descrtiptionCheck
};
