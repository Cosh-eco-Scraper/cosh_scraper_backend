import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: "AIzaSyA2dYJVOQNBmh9Ne2b3lnuO-Fbw7oSAV6U" });

const sendPrompt = async (prompt: string): Promise<string | undefined> => {
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
  });
  console.log(response.text);
    return response.text;
}


export const LLMService = {
  sendPrompt,
};
