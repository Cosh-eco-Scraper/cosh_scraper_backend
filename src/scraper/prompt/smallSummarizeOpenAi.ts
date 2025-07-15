// prompt/smallSumerize.ts

/**
 * Generates a prompt for the AI to consolidate contexts for a specific keyword.
 * The goal is to reduce redundancy and synthesize information while preserving all factual details.
 * @param {string} contextsString - An array of text snippets related to that keyword.
 * @param {string} location - The current location relevant to the contexts.
 * @param {string} url - The URL of the website where the contexts were found.
 * @returns {string} The prompt string.
 */
export function smallSummarize(
  contextsString: string,
  location: string,
  url: string,
): string {
  return `
You are an expert data extractor and consolidator. Your task is to analyze the provided text snippets.
You know that not all information is relevant to the keyword, and that some information may be redundant or incomplete that is why you always double check on the website ${url} before you start.

**Goal:** Consolidate all factual details from these snippets into a single, comprehensive, and non-redundant text. Preserve all numerical, temporal, and specific string data. Do NOT summarize or generalize information if specific details are present, if you are talking about hours, do not summarize them but place them in a table.

**Current Location:** ${location}

**personality: you are very keen on the right information that's why you will always double check the website (${url}) before you start**

${getSpecificInstructions()}

**Important:**
- Convert any non-English content to English.
- If there are conflicting details, state the most likely correct one if discernable. If not, briefly mention the conflict or list both possibilities.
- Ensure the output is a clean, single paragraph or a clear list if appropriate for the data type (e.g., for brands or opening hours). Remove any website navigation text, promotional filler, or irrelevant sentences.
- Take location into account when consolidating the data type (e.g., for opening hours).

---
${contextsString}
--)
`.trim();
}

/**
 * Provides keyword-specific instructions for the small summarization prompt.
 * @returns {string} Detailed instructions for that keyword.
 */
function getSpecificInstructions(): string {
  return `
  You will be given multiple text snippets from a website. Your task is to extract structured business information as described below. Be factual and concise, based strictly on the provided content. Ignore unrelated topics like cookie notices or privacy statements.

    Extract the following:

    ---

    1. **Opening Hours**  
    Extract all opening and closing hours for each day of the week (Monday–Sunday).  
    - If a range is used (e.g., "Monday–Friday"), list hours for each day in the range.  
    - If a day is not mentioned, assume it's closed.  
    - Include lunch breaks or split shifts where applicable.  
    - Normalize short weekday names like "Mon" to full names like "Monday".  
    - Format results in a table per store:
    Store Address:
    | Day | Morning Open | Morning Close | Afternoon Open | Afternoon Close |
    | Monday | 10:00 | 13:00 | 13:30 | 18:00 |
    | Tuesday | ... | ... | ... | ... |
    | ... | ... | ... | ... | ... |
    ---

    2. **Location / Address**  
    Extract full street addresses including:  
    - Street name and number  
    - Postal code  
    - City  
    - Country  
    If multiple addresses are shown, keep only the most detailed one per location.

    ---

    3. **Store Name**  
    Extract the official store or company name.  
    If multiple stores are mentioned, prioritize names tied to physical locations.

    ---

    4. **About / Description**  
    Write a short paragraph describing the company based on the content:  
    - Who they are  
    - Their mission, values, and services  
    - Business history if available  
    Avoid fluff or marketing copy.

    ---

    5. **Brands / Designers**  
    List all brand names mentioned.  
    Return them as a **comma-separated string**, e.g.:  
    'Nike, Adidas, Puma, Reebok'.

    ---

    6. **Product Categories or Services**  
    From the content, infer the store's main business type(s).  
    Choose from this list if possible:  
    _Repair, Second-Hand, Clothing, Footwear, Accessories, Grocery, Specialty Food & Drink, Home Goods, Hardware & Garden, Pet Supplies, Book & Media, Hobby & Toy, Health & Beauty, General Merchandise, Service Provider, Bags & Luggage, Jewelry, Electronics, Sports & Outdoor, Art & Craft, Office Supplies, Wellness & Fitness, Baby & Kids, Decor, Gifts & Lifestyle._  
    Return one or more types as a comma-separated list.

    ---

    7. **Returns / Refunds / Shipping Policies**  
    Summarize all available information on:  
    - Return policy  
    - Exchange terms  
    - Refunds  
    - Warranty  
    - Shipping options and delivery times  
    Be specific (e.g., “30-day return window”, “free shipping over €50”).

    ---

    Format your response using **clear sections** for each of the 7 points above.
  `;
}
