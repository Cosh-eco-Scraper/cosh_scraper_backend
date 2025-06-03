import { Page } from 'playwright';
import * as dotenv from 'dotenv';
import getPrompt from './prompt/prompt';
import getKeywords from './keywords';
import { LLMService } from '../services/llm.service';

dotenv.config();
type ScrapedInfo = {
  url: string;
  name: string;
  brands: string[];
  openingHours: {
    monday: {
      open: string;
      close: string;
      openAfterNoon: string | null;
      closeAfterNoon: string | null;
    } | null;
    tuesday: {
      open: string;
      close: string;
      openAfterNoon: string | null;
      closeAfterNoon: string | null;
    } | null;
    wednesday: {
      open: string;
      close: string;
      openAfterNoon: string | null;
      closeAfterNoon: string | null;
    } | null;
    thursday: {
      open: string;
      close: string;
      openAfterNoon: string | null;
      closeAfterNoon: string | null;
    } | null;
    friday: {
      open: string;
      close: string;
      openAfterNoon: string | null;
      closeAfterNoon: string | null;
    } | null;
    saturday: {
      open: string;
      close: string;
      openAfterNoon: string | null;
      closeAfterNoon: string | null;
    } | null;
    sunday: {
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
};

// Define the return type for the modified scraper function
// It now directly returns the dictionary of keyword contexts
export type ScraperResult = Record<string, string[]> | null;

/**
 * Detects the language of the page by checking the 'lang' attribute of the html tag
 * or the 'content-language' meta tag. Defaults to 'en' if not found.
 * @param {Page} page - The Playwright Page object.
 * @returns {Promise<string>} The detected language code (e.g., 'en', 'fr').
 */
async function detectLanguage(page: Page): Promise<string> {
  const htmlLang = await page.$eval('html', (el) => el.getAttribute('lang') || '');
  if (htmlLang) {
    return htmlLang.split('-')[0].toLowerCase();
  }

  const metaLang = await page
    .$eval('meta[http-equiv="content-language"]', (el) => el.getAttribute('content') || '')
    .catch(() => '');

  if (metaLang) {
    return metaLang.split('-')[0].toLowerCase();
  }

  return 'en'; // Default to English if no language detected
}

/**
 * Summarizes relevant information using the AI model, with retry logic for API calls.
 * @param {string} url - The URL that was scraped.
 * @param {string[]} snippets - Relevant text snippets from the page.
 * @param {string} location - The location context for the AI.
 * @returns {Promise<ScrapedInfo | null>} The parsed ScrapedInfo object, or null on failure.
 */
export async function summarizeRelevantInfoWithAI(
  url: string,
  snippets: string[],
  location: string,
): Promise<ScrapedInfo | null> {
  const prompt = getPrompt(url, snippets, location);
  let attempts = 0;
  const maxAttempts = 5;
  const baseDelay = 1500;

  while (attempts < maxAttempts) {
    try {
      const aiResponse = await LLMService.sendPrompt(prompt);

      if (!aiResponse) {
        console.error('AI response is empty');
        attempts++;
        const delay = baseDelay * Math.pow(2, attempts);
        // eslint-disable-next-line no-undef
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonString = jsonMatch[0];
          const parsed = JSON.parse(jsonString) as ScrapedInfo;
          if (!parsed.name || !parsed.openingHours || !parsed.type || !parsed.brands) {
            throw new Error('Invalid JSON structure');
          }
          return parsed;
        }
        throw new Error('No JSON found in response');
      } catch (err) {
        console.error('Failed to parse AI response as JSON:', err);
        attempts++;
        const delay = baseDelay * Math.pow(2, attempts);
        // eslint-disable-next-line no-undef
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    } catch (error) {
      let err = error as any;

      if ((err.statusCode === 429 || err.statusCode === 503) && attempts < maxAttempts - 1) {
        attempts++;
        const delay = baseDelay * Math.pow(2, attempts);
        // eslint-disable-next-line no-undef
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      console.error('Failed to backoff from AI api: ', err.message);
      attempts++;
      const delay = baseDelay * Math.pow(2, attempts);
      // eslint-disable-next-line no-undef
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  console.error('Failed to get valid AI response after maximum attempts');
  return null;
}

/**
 * Scrapes a given URL, extracts contexts around a list of keywords.
 * @param {string} url - The URL to scrape.
 * @param {string} _location - The location context (currently unused in this function but kept for signature).
 * @param {Page} page - The Playwright Page object (passed as an argument).
 * @param {string[]} [keywordsToFind] - An optional array of keywords to find and extract context around. If not provided, default keywords for the detected language will be used.
 * @param {number} [wordsBefore=50] - Number of words to extract before each keyword occurrence.
 * @param {number} [wordsAfter=100] - Number of words to extract after each keyword occurrence.
 * @returns {Promise<ScraperResult>} A dictionary of keyword to list of contexts, or null on error.
 */
export async function scraper(
  url: string,
  _location: string,
  page: Page, // Accept page as an argument
  keywordsToFind?: string[], // Optional array of keywords to find context for
  wordsBefore: number = 50, // Default to 50 words before
  wordsAfter: number = 100, // Default to 100 words after
): Promise<ScraperResult> {
  console.log(`Scraping URL: ${url}`);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    const language = await detectLanguage(page);
    // Removed snippets gathering as per request to return only keyword contexts
    // const snippets = await gatherRelevantTexts(page, language);
    // console.log(`Extracted ${snippets.length} snippets.`);

    const keywordContexts: Record<string, string[]> = {};
    const keywordsToUse =
      keywordsToFind && keywordsToFind.length > 0 ? keywordsToFind : getKeywords(language);

    // Get the full text content of the page for keyword context extraction
    const pageText = await page.evaluate(() => {
      // Select common elements that typically contain main content
      const selectors = 'body, p, div, span, h1, h2, h3, h4, h5, h6, li, a, strong, em';
      let fullText = '';
      // eslint-disable-next-line no-undef
      document.querySelectorAll(selectors).forEach((element) => {
        // Get text content, trim whitespace, and add a space to separate words
        const text = element.textContent?.trim();
        if (text) {
          fullText += text + ' ';
        }
      });
      // Normalize whitespace: replace multiple spaces/newlines with a single space
      return fullText.replace(/\s+/g, ' ').trim();
    });

    // Split the text into words
    const words = pageText.split(/\s+/); // Split by one or more whitespace characters

    for (const keyword of keywordsToUse) {
      const keywordLower = keyword.toLowerCase();
      const contextsForKeyword: string[] = [];

      // Find all occurrences of the keyword
      for (let i = 0; i < words.length; i++) {
        if (words[i].toLowerCase() === keywordLower) {
          // Calculate start and end indices for the context
          const startIndex = Math.max(0, i - wordsBefore);
          const endIndex = Math.min(words.length, i + wordsAfter + 1); // +1 to include the keyword itself

          // Extract the context words
          const contextWords = words.slice(startIndex, endIndex);

          // Reconstruct the context string
          contextsForKeyword.push(contextWords.join(' '));
        }
      }

      if (contextsForKeyword.length > 0) {
        keywordContexts[keyword] = contextsForKeyword;
        console.log(`Keyword "${keyword}" found ${contextsForKeyword.length} time(s).`);
      } else {
        console.log(`Keyword "${keyword}" not found on the page.`);
      }
    }

    return keywordContexts; // Return only the dictionary
  } catch (error) {
    console.error('Error scraping URL:', url, error);
    return null;
  } finally {
    // This is correct: the page is closed after each task, which is then re-opened by the worker for the next task.
    if (page && !page.isClosed()) {
      // Add check for !page.isClosed() to prevent errors if already closed
      await page.close();
      console.log(`Scraper: Page for ${url} closed.`);
    }
  }
}
