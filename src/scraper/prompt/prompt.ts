export default function getPrompt(url: string, snippets: string[], location: string) {
  return `
${getHeader(url)}

${getSchemaDefinition()}

${getInstructions(location)}

${getSnippets(snippets)}

Respond ONLY with the JSON object.
    `.trim();
}

function getHeader(url: string): string {
  return `The website URL is: ${url}

Given the following relevant text snippets from a shop website, extract and summarize the following fields as a JSON object:`;
}

function getSchemaDefinition(): string {
  return `{
  "url": string,
  "name": string,
  "brands": string[],
  "openingHours": {
    "monday": {"open": string, "close": string } | null,
    "tuesday": {"open": string, "close": string } | null, 
    "wednesday": {"open": string, "close": string } | null,
    "thursday": {"open": string, "close": string } | null,
    "friday": {"open": string, "close": string } | null,
    "saturday": {"open": string, "close": string } | null,
    "sunday": {"open": string, "close": string } | null
  },
  "location": string,
  "about": string,
  "retour": string
}`;
}

function getInstructions(location: string): string {
  return `Instructions:
- For all string fields, remove any line breaks (\\n), plus signs (+), or other special characters. Return each string as a single, clean sentence or paragraph with normal spaces.
- For "name", extract the name of the shop.
- For "name", if there are multiple stores, pick the one matching "${location}" (case-insensitive, match city name) format it like "<name> - <city>", let city start with a capital letter.
- For "brands", extract all brand names mentioned in the snippets. If none are found, return an empty array.
- For "brands", remove any duplicates.
- For "brands", sort the array alphabetically.
- For "brands", use the official brand name used on the brands website. If there is no official brand name, use one name of the brand as it is written in the snippets.
- For "brands", start all brand names with a capital letter.
- For "openingHours", always return an object for each day ("monday" to "sunday") with "open" and "close" keys.
- For "openingHours", if the store is closed on a given day, return "closed" for the "open" and "close" values.
- For "openingHours", if the store is open on a given day, return the opening and closing times as "hh:mm" (24-hour format, zero-padded).
- For "OpeningHours", if the store doesn't mention a day it is default to "closed" for values "close" and "open".
- For "openingHours" and "location", extract ONLY the information relevant to the store in "${location}". If there are multiple stores, pick the one matching "${location}" (case-insensitive, match city name).
- For "openingHours" if a value should be null, return {"open": "closed", "close": "closed"}.
- For "openingHours", if you don't know the opening hours, first look it up on google if you dont find anything default to {"open": "closed", "close": "closed"}.'
- For "location" get the location that matches the store in "${location}". If there are multiple stores, pick the one matching "${location}" (case-insensitive, match city name).
- For "about" and "retour", extract the general information for the whole shop, not store-specific.
- For "about", make sure the text is correct and complete in english.
- For "retour", make sure the text is correct and complete in english.
- For "location", always return the address in this exact format:
  "<street>,<number>,<postalCode>,<city>,<country>"
  For example: "Burgemeester de Vlugtlaan,125,1063,Amsterdam,Netherlands"
  If any part is missing, first search it up on google and fill it in, search for example for <name> <city>, if you dont find any results for that store use the data you know of from the site and leave the rest empty: (e.g. ",,1063,Amsterdam,Netherlands").`;
}

function getSnippets(snippets: string[]): string {
  return `Snippets:
${snippets.map((s, i) => `[${i + 1}] ${s}`).join('\n')}`;
}
