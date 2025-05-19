import { GoogleGenAI } from "@google/genai";
import databaseClient from "../config/dbConnectionConfig";
const ai = new GoogleGenAI({ apiKey: "AIzaSyA2dYJVOQNBmh9Ne2b3lnuO-Fbw7oSAV6U" });

const sendPrompt = async (prompt: string): Promise<string | undefined> => {
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
  });
  console.log(response.text);

  databaseClient.connect();

  const query = "INSERT INTO stores (name,description, location_id) VALUES ($1, $2, $3)";
  const values = ["test Store", response.text, "test location"];
  const result = await databaseClient.query(query, values);
  console.log(result);
  await databaseClient.end();
  return response.text;
}




export const LLMService = {
  sendPrompt,
};
