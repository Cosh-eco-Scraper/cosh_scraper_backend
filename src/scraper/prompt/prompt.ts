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
- For "brands", extract all brand names mentioned in the snippets. If none are found, return an empty array.
- For "brands", remove any duplicates.
- For "brands", sort the array alphabetically.
- For "brands", use the official brand name that is used on the brands website. If there is no official brand name, use one name of the brand as it is written in the snippets.
- For "brands", start all brand names with a capital letter.
- For "openingHours", always return an object for each day ("monday" to "sunday") with "open" and "close" keys. If the time for a given day is not found, set both "open" and "close" to "closed". Do NOT use null for the whole day, always use the object format. If a day is marked as "gesloten" or "closed", set both "open" and "close" to "closed".
- For "openingHours" and "location", extract ONLY the information relevant to the store in "${location}". If there are multiple stores, pick the one matching "${location}" (case-insensitive, match city name).
- For "location" get the location that matches the store in "${location}". If there are multiple stores, pick the one matching "${location}" (case-insensitive, match city name).
- For "about" and "retour", extract the general information for the whole shop, not store-specific.
- For "location", always return the address in this exact format:
  "<street>,<number>,<postalCode>,<city>,<country>"
  For example: "Burgemeester de Vlugtlaan,125,1063,Amsterdam,Netherlands"
  If any part is missing, leave it empty but keep the commas (e.g. ",,1063,Amsterdam,Netherlands").
- For "openingHours", always format the "open" and "close" times as "hh:mm" (24-hour format, zero-padded).`;
}

function getSnippets(snippets: string[]): string {
  return `Snippets:
${snippets.map((s, i) => `[${i + 1}] ${s}`).join('\n')}`;
}
