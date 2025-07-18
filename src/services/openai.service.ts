import { OpenAI } from 'openai';
import * as dotenv from 'dotenv';

const MODEL = 'gpt-4o-mini';

dotenv.config();
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  organization: 'org-H3OBf2yD2orRAzBVcQ78HPeG',
});
const maxRPM = 30; // This is your self-imposed rate limit
const minDelay = Math.ceil(60000 / maxRPM);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const parameters = {
  "type": "object",
  "properties": {
    "url": {
      "type": "string",
      "description": "URL of the shop's website. Include full URL including https://."
    },
    "name": {
      "type": "string",
      "description": "Name of the shop. If multiple stores are listed, pick the one matching the given city (${location}). Format as '<name> - <City>' with proper capitalization. Clean special characters and line breaks."
    },
    "brands": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "List of brand names mentioned on the site. Use official brand names when possible, remove duplicates, start with a capital letter, sort alphabetically. Return an empty array if no brands are found."
    },
    "openingHours": {
      "type": "object",
      "description": "Opening hours per weekday. Handle siesta/lunch breaks. Format as described below.",
      "properties": {
        "Monday": { "$ref": "#/definitions/dayHours" },
        "Tuesday": { "$ref": "#/definitions/dayHours" },
        "Wednesday": { "$ref": "#/definitions/dayHours" },
        "Thursday": { "$ref": "#/definitions/dayHours" },
        "Friday": { "$ref": "#/definitions/dayHours" },
        "Saturday": { "$ref": "#/definitions/dayHours" },
        "Sunday": { "$ref": "#/definitions/dayHours" }
      },
      "required": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    },
    "location": {
      "type": "string",
      "description": "Physical store address in this exact format: '<street>,<number>,<postalCode>,<city>,<country>'. If data is missing, look it up online or leave empty. Capitalize city and country names."
    },
    "about": {
      "type": "string",
      "description": "General shop information (not store-specific). Must be correct and complete in English. If none found, return 'No information found'."
    },
    "retour": {
      "type": "string",
      "description": "Return policy summary. Short, concise, and in English. Example: '30 day, money back guarantee, free shipping'. If none found, return 'No information found'."
    },
    "type": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "List of business types for the shop. Use provided reference values from getBusinessTypes()."
    }
  },
  "required": ["url", "name", "brands", "openingHours", "location", "about", "retour", "type"]
};

const definitions = {
  "dayHours": {
    "properties": {
      "open": {
        "type": "string",
        "description": "Opening time in HH:MM 24-hour format or 'closed'.",
      },
      "close": {
        "type": "string",
        "description": "Closing time in HH:MM 24-hour format or 'closed'."
      },
      "openAfterNoon": {
        "type": ["string", "null"],
        "description": "Afternoon re-opening time if applicable (HH:MM), otherwise null."
      },
      "closeAfterNoon": {
        "type": ["string", "null"],
        "description": "Afternoon closing time if applicable (HH:MM), otherwise null."
      }
    },
    "required": ["open", "close", "openAfterNoon", "closeAfterNoon"]
  }
};

const functions = [
  {
    "name": "extract_shop_data",
    "description": "Extracts structured shop data from scraped website text, following specific formatting and content rules.",
    "parameters": parameters,
    "definitions": definitions
  },
  {
    "name": "merge_shop_data",
    "description": "Merges structured shop data from a set of already structured shop data, following specific formatting and content rules. From the given structured shop data, for each field pick the value that seems best to you, either the most common or the one that makes the most sense out of all the options, and keep in mind values in arrays can be added together (without duplicates).",
    "parameters": parameters,
    "definitions": definitions
  },
];

const baseCreation = (model: string, prompt: string) => ({
  model,
  messages: [{ role: 'user', content: prompt }],
  temperature: 0.2,
});

const functionCreation = (model: string, prompt: string, functionName: string) => ({
  model,
  messages: [{ role: 'user', content: prompt }],
  functions,
  function_call: { name: functionName },
  temperature: 0.2,
});

const sendBasePrompt = async (prompt: string): Promise<string | undefined> => {
  const creationObject = functionCreation(MODEL, prompt, 'extract_shop_data');
  return await sendPrompt(creationObject);
};

const sendFinalMergePrompt = async (prompt: string): Promise<string | undefined> => {
  const creationObject = functionCreation(MODEL, prompt, 'merge_shop_data');
  return await sendPrompt(creationObject);
};

const sendPrompt = async (creationObject: any): Promise<any | undefined> => {
  // The minDelay from your original code is still useful as a general rate limit
  // but the specific retryDelay from the API error is more precise for 429s.
  let backOffAmount = 1;
  let backOffTime = 1000;
  let retry: boolean = true;

  // console.log(`[AI] waiting for ${minDelay}ms before sending prompt.`);
  // await sleep(minDelay);

  while (retry) {
    try {
      const response = await openai.chat.completions.create(creationObject);
      // @ts-ignore
      return JSON.parse(response.choices[0].message?.function_call?.arguments);
      // return response.choices[0].message?.content?.trim();
    } catch (error) {
      if (error instanceof Error) {
        console.error('[AI] Error:', error.message);
        const currentDelay = backOffTime * Math.pow(2, backOffAmount);
        console.log(`[AI] Backing off for: ${currentDelay}ms`);
        await sleep(currentDelay);
        backOffAmount++;
      }
      retry = true;
    }
  }
};

const descriptionGenerator = async (prompt: string): Promise<string | undefined> => {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-2025-04-14',
      messages: [
        { role: "system", content: "You are a helpful assistant that summarizes extracted info." },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
    });
    const result = response.choices[0].message?.content?.trim();
    return result;
  } catch (error: any) {
    console.error('[AI] Error in descriptionGenerator: ', error.message);
    return undefined;
  }
};

const descriptionCheck = async (description: string): Promise<string | undefined> => {
  const prompt = `
    Give me only "Yes, it does comply" or "No, it does not comply" as an answer.
    
    Does the following description comply with European and Belgian guidelines for greenwashing?
    
  "${description}"`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    });
    const result = response.choices[0].message?.content?.trim();
    return result;
  } catch (error: any) {
    console.error('[AI] Error in descriptionCheck: ', error.message);
    return undefined;
  }
};

export const OpenAIService = {
  sendPrompt,
  sendBasePrompt,
  sendFinalMergePrompt,
  descriptionCheck,
  descriptionGenerator,
};
