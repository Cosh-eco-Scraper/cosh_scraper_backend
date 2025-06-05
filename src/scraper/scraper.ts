import { Page } from 'playwright';
import * as dotenv from 'dotenv';
import getPrompt from './prompt/prompt';
import getKeywords from './keywords';
import { LLMService } from '../services/llm.service';
import * as fs from 'fs';

dotenv.config();

// (ScrapedInfo type remains the same as provided)
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

// (ScraperResult type remains the same)
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
  snippets: string[], // These will now be consolidated snippets
  location: string,
): Promise<ScrapedInfo | null> {
  const prompt = getPrompt(url, snippets, location);
  let attempts = 0;
  const maxAttempts = 5;
  const baseDelay = 1500;

  snippets.forEach(console.log); // Keep for debugging if needed

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
        const jsonMatch = aiResponse.match(/\{[\s\S]*}/);
        if (jsonMatch) {
          const jsonString = jsonMatch[0];
          const parsed = JSON.parse(jsonString) as ScrapedInfo;
          // You might add more rigorous validation here if needed
          if (!parsed.name || !parsed.openingHours || !parsed.type || !parsed.brands) {
            throw new Error('Invalid JSON structure: Missing critical fields after parsing.');
          }
          return parsed;
        }
        throw new Error('No JSON found in AI response, or JSON is malformed.');
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
      console.error('Failed to backoff from AI API:', err.message);
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
 * @param {string} _location - The location context.
 * @param {Page} page - The Playwright Page object.
 * @param {string[]} [keywordsToFind] - An optional array of keywords. If not provided, default keywords for the detected language will be used.
 * @param {Record<string, number>} [wordsBeforeMap] - Optional map for keyword-specific wordsBefore.
 * @param {Record<string, number>} [wordsAfterMap] - Optional map for keyword-specific wordsAfter.
 * @returns {Promise<ScraperResult>} A dictionary of keyword to list of contexts, or null on error.
 */
export async function scraper(
  url: string,
  _location: string,
  page: Page, // Accept page as an argument
  keywordsToFind?: string[], // Optional array of keywords to find context for
  // New: Optional maps for dynamic context lengths
  wordsBeforeMap?: Record<string, number>,
  wordsAfterMap?: Record<string, number>,
): Promise<ScraperResult> {
  console.log(`Scraping URL: ${url}`);
  fs.appendFileSync('files/scraped_urls.txt', url + '\n');

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    const language = await detectLanguage(page);
    const keywordContexts: Record<string, string[]> = {};
    const keywordsToUse =
      keywordsToFind && keywordsToFind.length > 0 ? keywordsToFind : getKeywords(language);

    const pageText = await page.evaluate(() => {
      // Select common elements that typically contain main content
      const selectors = 'body, p, div, span, h1, h2, h3, h4, h5, h6, li, a, strong, em';
      let fullText = '';
      // eslint-disable-next-line no-undef
      document.querySelectorAll(selectors).forEach((element) => {
        const text = element.textContent?.trim();
        if (text) {
          fullText += text + ' ';
        }
      });
      return fullText.replace(/\s+/g, ' ').trim();
    });

    const words = pageText.split(/\s+/);

    for (const keyword of keywordsToUse) {
      const keywordLower = keyword.toLowerCase();
      const contextsForKeyword: string[] = [];

      // Determine context lengths dynamically based on keyword maps, or use defaults
      const currentWordsBefore = wordsBeforeMap?.[keywordLower] ?? 50; // Default 50
      const currentWordsAfter = wordsAfterMap?.[keywordLower] ?? 100; // Default 100

      for (let i = 0; i < words.length; i++) {
        if (words[i].toLowerCase() === keywordLower) {
          const startIndex = Math.max(0, i - currentWordsBefore);
          const endIndex = Math.min(words.length, i + currentWordsAfter + 1);

          const contextWords = words.slice(startIndex, endIndex);
          contextsForKeyword.push(contextWords.join(' '));
        }
      }

      if (contextsForKeyword.length > 0) {
        keywordContexts[keyword] = contextsForKeyword;
        // console.log(`Keyword "${keyword}" found ${contextsForKeyword.length} time(s).`); // Too verbose
      } else {
        // console.log(`Keyword "${keyword}" not found on the page.`); // Too verbose
      }
    }

    return keywordContexts;
  } catch (error) {
    console.error('Error scraping URL:', url, error);
    return null;
  } finally {
    if (page && !page.isClosed()) {
      await page.close();
      // console.log(`Scraper: Page for ${url} closed.`); // Too verbose
    }
  }
}
