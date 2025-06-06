// prompt/smallSumerize.ts

/**
 * Generates a prompt for the AI to consolidate contexts for a specific keyword.
 * The goal is to reduce redundancy and synthesize information while preserving all factual details.
 * @param {string} keyword - The specific keyword (e.g., "openingHours", "location").
 * @param {string[]} contexts - An array of text snippets related to that keyword.
 * @param {string} location - The current location relevant to the contexts.
 * @param {string} url - The URL of the website where the contexts were found.
 * @returns {string} The prompt string.
 */
export function smallSumerize(
  keyword: string,
  contexts: string[],
  location: string,
  url: string,
): string {
  // Use a clear separator for multiple contexts
  const contextsString = contexts.map((s, i) => `[Snippet ${i + 1}]: ${s.trim()}`).join('\n---\n');

  return `
You are an expert data extractor and consolidator. Your task is to analyze the provided text snippets, which are all related to the keyword "${keyword}".
You know that not all information is relevant to the keyword, and that some information may be redundant or incomplete that is why you always double check on the website ${url} before you start.

**Goal:** Consolidate all factual details from these snippets into a single, comprehensive, and non-redundant text. Preserve all numerical, temporal, and specific string data. Do NOT summarize or generalize information if specific details are present, if you are talking about hours, do not summarize them but place them in a table.

**Current Location:** ${location}

**personality: you are very keen on the right information that's why you will always double check the website (${url}) before you start**

**Specific Instructions for "${keyword}":**

${getSpecificInstructions(keyword)}

**Important:**
- Convert any non-English content to English.
- If there are conflicting details, state the most likely correct one if discernable. If not, briefly mention the conflict or list both possibilities.
- Ensure the output is a clean, single paragraph or a clear list if appropriate for the data type (e.g., for brands or opening hours). Remove any website navigation text, promotional filler, or irrelevant sentences.
- Take location into account when consolidating the data type (e.g., for opening hours).

---
**Text Snippets for "${keyword}":**
${contextsString}
---

**Consolidated and Detailed Information for "${keyword}":**
`.trim();
}

/**
 * Provides keyword-specific instructions for the small summarization prompt.
 * @param {string} keyword - The keyword being processed.
 * @returns {string} Detailed instructions for that keyword.
 */
function getSpecificInstructions(keyword: string): string {
  switch (keyword.toLowerCase()) {
    case 'openinghours':
    case 'open':
    case 'opening':
    case 'hour':
    case 'hours':
    case 'time':
    case 'times':
    case 'monday':
    case 'mon':
    case 'tuesday':
    case 'tue':
    case 'wednesday':
    case 'wed':
    case 'thursday':
    case 'thu':
    case 'friday':
    case 'fri':
    case 'saturday':
    case 'sat':
    case 'sunday':
    case 'sun':
    case 'closed':
    case 'business hours':
    case 'schedule':
    case 'weekdays':
    case 'weekends':
    case 'public holidays':
    case 'from':
    case 'to':
    case 'and':
    case 'appointments':
      return `
      Extract ALL opening and closing hours for EACH day of the week (Monday-Sunday) for a location.
      If days are listed like "monday - friday", then the hours are listed for each day separately, monday til friday in this case.
      If days are not listed, assume they are closed that day.
      Note any lunch breaks or split hours.
      If a day is closed, state "closed".
      Note: if any day is writen in short form (e.g., "Mon") use the full name (e.g., "Monday").
        some more examples:
        * "mon" becomes "Monday"
        * "tue" becomes "Tuesday"
        * "wed" becomes "Wednesday"
        * "thu" becomes "Thursday"
        * "fri" becomes "Friday"
        * "sat" becomes "Saturday"
        * "sun" becomes "Sunday"
      This will work the same for other languages.
      return every opening and closing hours in a table per city
      example:
      "
      Leuven, Belgium:
      | days      | morning open | morning close | after noon open | after noon close |
      | Monday    | 10:00        | 13:00         | 13:30           | 18:00            |
      | Tuesday   | 10:00        | 13:00         | 13:30           | 18:00            |
      | Wednesday | 10:00        | 13:00         | 13:30           | 18:00            |
      | Thursday  | 10:00        | 13:00         | 13:30           | 18:00            |
      | Friday    | 10:00        | 13:00         | 13:30           | 18:00            |
      | Saturday  | 10:00        | open          | open            | 18:00            |
      | Sunday    | closed       | closed        | closed          | closed           |
      "
      `;
    case 'location':
    case 'address':
    case 'directions':
    case 'map':
    case 'find us':
    case 'store':
    case 'stores':
    case 'shop':
    case 'shops':
    case 'street':
    case 'avenue':
    case 'road':
    case 'lane':
    case 'place':
    case 'suite':
    case 'apt':
    case 'unit':
    case 'city':
    case 'state':
    case 'province':
    case 'zip code':
    case 'postal code':
    case 'country':
      return `
      Extract the complete street address including street name, house number, postal code, city, and country.
      If multiple addresses are present for the *same* store, prioritize the most detailed one.
      If a specific store location (e.g., "Amsterdam") is mentioned, only extract information for that location's address.
      Example: "Burgemeester de Vlugtlaan 125, 1063 Amsterdam, Netherlands."
      `;
    case 'brands':
    case 'brand':
    case 'our brands':
    case 'featured brands':
    case 'brand list':
    case 'designers':
    case 'collections':
    case 'products by brand':
      return `
      Extract all distinct brand names mentioned.
      List them as a comma-separated string.
      Example: "Nike, Adidas, Puma, Reebok."
      `;
    case 'about':
    case 'about us':
    case 'intro':
    case 'our story':
    case 'mission':
    case 'vision':
    case 'values':
    case 'team':
    case 'staff':
    case 'history':
    case 'what we do':
    case 'company profile':
    case 'who we are':
      return `
      Consolidate all factual information about the company's history, mission, values, services, and general description into a single, coherent paragraph.
      Focus on core facts and purpose.
      `;
    case 'retour':
    case 'returns':
    case 'policy':
    case 'policies':
    case 'refund':
    case 'exchange':
    case 'shipping':
    case 'delivery':
    case 'warranty':
    case 'guarantee':
    case 'disclaimer':
    case 'cancellation':
    case 'return policy':
    case 'refunds':
    case 'exchanges':
    case 'shipping & returns':
    case 'customer service':
    case 'how to return':
    case 'eligibility':
    case 'process':
      return `
      Consolidate all essential details about the return policy, exchange policy, refund terms, shipping options, delivery times, and warranty information.
      Be concise but include all key conditions (e.g., "30-day return window", "free shipping over $50", "proof of purchase required").
      `;
    case 'type':
    case 'categories':
    case 'shop by':
    case 'departments':
    case 'products':
    case 'what we sell':
    case 'services':
    case 'specialties':
    case 'electronics':
    case 'fashion':
    case 'clothing':
    case 'apparel':
    case 'footwear':
    case 'jewelry':
    case 'home goods':
    case 'furniture':
    case 'decor':
    case 'groceries':
    case 'food':
    case 'books':
    case 'sporting goods':
    case 'outdoor':
    case 'hardware':
    case 'tools':
    case 'pharmacy':
    case 'beauty':
    case 'cosmetics':
    case 'automotive':
    case 'kids':
    case 'toys':
    case 'pet supplies':
    case 'gifts':
    case 'art':
    case 'crafts':
    case 'music':
    case 'movies':
    case 'video games':
    case 'health':
    case 'wellness':
    case 'fitness':
    case 'baby & kids':
    case 'bags & luggage':
    case 'general merchandise':
    case 'office supplies':
    case 'repair':
    case 'second-hand':
    case 'specialty food & drink':
    case 'service provider':
      return `
      Based on the snippets provided, infer the primary business type(s) of the shop.
      Choose from: Repair, Second-Hand, Clothing, Footwear, Accessories, Grocery, Specialty Food & Drink, Home Goods, Hardware & Garden, Pet Supplies, Book & Media, Hobby & Toy, Health & Beauty, General Merchandise, Service Provider, Bags & Luggage, Jewelry, Electronics, Sports & Outdoor, Art & Craft, Office Supplies, Wellness & Fitness, Baby & Kids, Decor, Gifts & Lifestyle.
      If multiple types apply, list them comma-separated.
      `;
    case 'name':
    case 'welcome to':
    case 'our shop':
    case 'company':
      return `
      Extract the official name of the shop. If multiple stores are mentioned, identify the name of the store specific to the provided location if discernable.
      `;
    default:
      return `
      Consolidate all relevant information related to "${keyword}" into a concise and factual paragraph.
      `;
  }
}
