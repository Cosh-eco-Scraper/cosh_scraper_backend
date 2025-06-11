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
  return `
  You are an expert data classifier and summarizer. You will be given a list of relevant text snippets from a shop website, and you will place them into their respective fields in a JSON object. 
  
  
**Goal:** Consolidate all factual details from these snippets into a single, comprehensive, and non-redundant JSON object, if any data would be missing, or incorrect the check it on the website (${url}) and correct it.
          It is important to note that the snippets are not always correct, and that the information in the snippets is not always complete. so checking the information on the website is the best way to ensure that the information is correct.
`;
}

function getSchemaDefinition(): string {
  return `{
  url: string;
  name: string;
  brands: string[];
  openingHours: {
    Monday: {
      open: string;
      close: string;
      openAfterNoon: string | null;
      closeAfterNoon: string | null;
    } | null;
    Tuesday: {
      open: string;
      close: string;
      openAfterNoon: string | null;
      closeAfterNoon: string | null;
    } | null;
    Wednesday: {
      open: string;
      close: string;
      openAfterNoon: string | null;
      closeAfterNoon: string | null;
    } | null;
    Thursday: {
      open: string;
      close: string;
      openAfterNoon: string | null;
      closeAfterNoon: string | null;
    } | null;
    Friday: {
      open: string;
      close: string;
      openAfterNoon: string | null;
      closeAfterNoon: string | null;
    } | null;
    Saturday: {
      open: string;
      close: string;
      openAfterNoon: string | null;
      closeAfterNoon: string | null;
    } | null;
    Sunday: {
      open: string;
      close: string;
      openAfterNoon: string | null;
      closeAfterNoon: string | null;
    } | null;
  };
  location: string;
  about: string;
  retour: string;
  type: string[];
}`;
}

function getInstructions(location: string): string {
  return `Instructions:
— For all string fields, remove any line breaks (\\n), plus signs (+), or other special characters. Return each string as a single, clean sentence or paragraph with normal spaces.
- For "name", extract the name of the shop.
- For "name", if there are multiple stores, pick the one matching "${location}" (case-insensitive, match city name) format it like "<name> - <city>", let city start with a capital letter.
- For "brands", extract all brand names mentioned in the snippets. If none are found, return an empty array.
- For "brands", remove any duplicates.
- For "brands", sort the array alphabetically.
- For "brands", use the official brand name used on the brands website. If there is no official brand name, use one name of the brand as it is written in the snippets.
- For "brands", start all brand names with a capital letter.
- For "location" get the location that matches the store in "${location}". If there are multiple stores, pick the one matching "${location}" (case-insensitive, match city name).
- For "about" and "retour", extract the general information for the whole shop, not store-specific.
- For "about", make sure the text is correct and complete in english.
- For "retour", make sure the text is correct and complete in english.
- For "retour", keep it short and concise. for example (e.g. "30 day, money back guarantee, free shipping")
- For "location", always return the address in this exact format:
  "<street>,<number>,<postalCode>,<city>,<country>"
  For example: "Burgemeester de Vlugtlaan,125,1063,Amsterdam,Netherlands"
  If any part is missing, first search it up on google and fill it in, search for example for <name> <city>, if you dont find any results for that store use the data you know of from the site and leave the rest empty: (e.g. ",,1063,Amsterdam,Netherlands"))
- For "Location" Make sure the capitalization of a country is correct (e.g. "Netherlands" not "netherlands").
- For "Location" Make sure the capitalization of a city is correct (e.g. "Antwerpen" not "antwerpen").
- For "type", extract the business types of the shop, use ${getBussinessTypes()} as a reference.

- For "openingHours", always return a daily object for each day ("monday" to "sunday"). Each daily object must contain four keys: "open", "close", "openAfterNoon", and "closeAfterNoon".

- For "openingHours", if a store is closed for the entire day, set "open" and "close" values to "closed", and "openAfterNoon" and "closeAfterNoon" values to null.

- For "openingHours", when parsing time ranges that include a lunch break or siesta:
  * The first range should be represented by "open" and "close"
  * The second range should be represented by "openAfterNoon" and "closeAfterNoon"
  * Times like "9:00-12:00, 14:00-18:00" should be parsed as:
    {"open": "09:00", "close": "12:00", "openAfterNoon": "14:00", "closeAfterNoon": "18:00"}
  * Time like "10:00 - 18:00 - (Gesloten 12:00 - 12:30)" should be parsed as: {"open": "10:00", "close": "12:00", "openAfterNoon": "12:30", "closeAfterNoon": "18:00"}

- For "openingHours", recognize common lunch break patterns such as:
  * "9:00-12:00 and 14:00-18:00"
  * "9:00-12:00 / 14:00-18:00"
  * "9:00-12:00, 14:00-18:00"
  * "9:00-12:00 & 14:00-18:00"
  * "9:00-18:00 (closed between 12:00-14:00)"

- For "openingHours", ensure that if either openAfterNoon or closeAfterNoon is set, both must be set with valid times

- For "openingHours", if a store is open continuously without any breaks within the day (e.g., "10:00-18:00"), set "open" to the start time and "close" to the end time. Set "openAfterNoon" and "closeAfterNoon" values to null.

- For "openingHours", all times should be formatted as "HH:MM" (24-hour format, zero-padded).

- For "openingHours", if a day's hours are not explicitly mentioned on the website, default that day to closed: {"open": "closed", "close": "closed", "openAfterNoon": null, "closeAfterNoon": null}.

- For "openingHours" and "location", extract ONLY the information relevant to the store matching the provided "${location}" (case-insensitive, match city name). If multiple stores are present, prioritize the matching location.

- For "openingHours", if the opening hours cannot be found on the provided URL, first attempt to look them up on google.com using the store name and the city name. If still no results are found, return {"open": "closed", "close": "closed", "openAfterNoon": null, "closeAfterNoon": null} for that day.

- For "openingHours", check if the information is correct and complete with the store url. if not, correct this information.
`;
}
function getSnippets(snippets: string[]): string {
  return `Snippets:
${snippets.map((s, i) => `[${i + 1}] ${s}`).join('\n')}
`;
}

function getBussinessTypes() {
  const businessTypes: string[] = [
    'Repair',
    'Second-Hand',
    'Clothing',
    'Footwear',
    'Accessories',
    'Grocery',
    'Specialty Food & Drink',
    'Home Goods',
    'Hardware & Garden',
    'Pet Supplies',
    'Book & Media',
    'Hobby & Toy',
    'Health & Beauty',
    'General Merchandise',
    'Service Provider',
    'Bags & Luggage',
    'Jewelry',
    'Electronics',
    'Sports & Outdoor',
    'Art & Craft',
    'Office Supplies',
    'Wellness & Fitness',
    'Baby & Kids',
    'Decor',
    'Gifts & Lifestyle',
  ];

  return businessTypes;
}
