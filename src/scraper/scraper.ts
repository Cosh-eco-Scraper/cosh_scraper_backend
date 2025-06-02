import { Page } from 'playwright';
import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
import { distance } from 'fastest-levenshtein';
import getPrompt from './prompt/prompt';
import getKeywords from './keywords';

dotenv.config();
const ai = new GoogleGenAI({ apiKey: process.env.AI_API_KEY });

type ScrapedInfo = {
  url: string;
  name: string;
  brands: string[];
  openingHours: {
    monday: { open: string; close: string } | null;
    tuesday: { open: string; close: string } | null;
    wednesday: { open: string; close: string } | null;
    thursday: { open: string; close: string } | null;
    friday: { open: string; close: string } | null;
    saturday: { open: string; close: string } | null;
    sunday: { open: string; close: string } | null;
  };
  location: string;
  about: string;
  retour: string;
};

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

function rankSnippetsByKeywordMatch(snippets: string[], keywords: string[]): string[] {
  const lowerKeywords = keywords.map((k) => k.toLowerCase());

  const scored = snippets.map((snippet) => {
    const lower = snippet.toLowerCase();
    const keywordMatches = lowerKeywords.reduce((count, keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = lower.match(regex);
      return count + (matches ? matches.length : 0);
    }, 0);

    return { snippet, score: keywordMatches };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score; // Higher score first
    }
    return a.snippet.length - b.snippet.length; // Shorter snippet first for tie-breaking
  });

  return scored.map((s) => s.snippet);
}

function deduplicateSnippets(
  snippets: string[],
  similarityThreshold = 0.85,
  maxChars = 1000000, // Default to a very large number if not specified
): string[] {
  const unique: string[] = [];

  for (const snippet of snippets) {
    const cleaned = snippet.replace(/\s+/g, ' ').trim(); // Normalize whitespace
    if (!cleaned || cleaned.length < 30) {
      // Filter out very short or empty snippets
      continue;
    }

    const isSimilar = unique.some((existing) => {
      const dist = distance(cleaned, existing);
      const maxLen = Math.max(cleaned.length, existing.length);
      // Calculate similarity: 1 - (distance / max_length)
      // If similarity is above threshold, they are considered similar
      return 1 - dist / maxLen > similarityThreshold;
    });

    if (!isSimilar) {
      unique.push(cleaned);
    }

    // Check total character count to prevent sending excessively large prompts
    const currentCharCount = unique.reduce((sum, s) => sum + s.length, 0);
    if (currentCharCount > maxChars) {
      break;
    }
  }

  return unique;
}

async function extractRelevantSnippets(page: Page, language: string): Promise<string[]> {
  const keywords = getKeywords(language); // Get keywords for the detected language
  const keywordRegex = new RegExp(keywords.join('|'), 'i'); // Create a regex for all keywords

  const title = await page.title();
  const metaDescription = await page
    .$eval('meta[name="description"]', (el: Element) =>
      (el as HTMLMetaElement).getAttribute('content'),
    )
    .catch(() => ''); // Handle case where meta description is not found

  // Extract text from larger structural blocks
  const blocks = await page.$$eval(
    'section, article, div, ul, ol, li, tr, span',
    (elements: Element[], keywordRegexStr: string) => {
      const regex = new RegExp(keywordRegexStr, 'i');
      return elements
        .map((el) => (el as HTMLElement).innerText?.trim() || '')
        .filter(Boolean) // Remove empty strings
        .filter(
          (text: string) =>
            regex.test(text) &&
            text.length > parseInt((process.env.MIN_SNIPPET_LENGTH as string) ?? '0') &&
            text.length < parseInt((process.env.MAX_SNIPPET_LENGTH as string) ?? '500'),
        ); // Filter by keyword and length
    },
    keywordRegex.source, // Pass regex source to the browser context
  );

  // Extract text from direct content elements
  const directSnippets = await page.$$eval(
    'h1, h2, h3, h4, h5, h6, p, span, li, td, th, tr',
    (elements: Element[], keywordRegexStr: string) => {
      const regex = new RegExp(keywordRegexStr, 'i');
      return elements
        .map((el) => el.textContent?.trim() || '')
        .filter(Boolean)
        .filter((text: string) => regex.test(text) && text.length > 0 && text.length < 500); // Filter by keyword and length
    },
    keywordRegex.source,
  );

  const allSnippets = [title, metaDescription, ...blocks, ...directSnippets]
    .map((s: string | null) => (s ?? '').trim())
    .filter(Boolean); // Ensure no nulls and trim all

  const uniqueSnippets = deduplicateSnippets(allSnippets);

  const rankedSnippets = rankSnippetsByKeywordMatch(uniqueSnippets, keywords);

  // Return a limited number of top-ranked snippets to manage prompt size
  return rankedSnippets.slice(0, 150);
}

async function gatherRelevantTexts(page: Page, language: string): Promise<string[]> {
  return await extractRelevantSnippets(page, language);
}

const sendPrompt = async (prompt: string): Promise<string | undefined> => {
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
  });
  console.log(response.text);
  return response.text;
};

export async function summarizeRelevantInfoWithAI(
  url: string,
  snippets: string[],
  location: string,
): Promise<ScrapedInfo | null> {
  const prompt = getPrompt(url, snippets, location);
  const aiResponse = await sendPrompt(prompt);
  if (!aiResponse) {
    console.error('AI response is empty');
    return null;
  }

  try {
    const jsonStart = aiResponse.indexOf('{');
    const jsonEnd = aiResponse.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      const jsonString = aiResponse.substring(jsonStart, jsonEnd + 1);
      return JSON.parse(jsonString) as ScrapedInfo;
    }
    return null;
  } catch (err) {
    console.error('Failed to parse AI response as JSON:', err);
    return null;
  }
}

export async function scraper(
  url: string,
  _location: string,
  page: Page, // Accept page as an argument
): Promise<{ snippets: string[] } | null> {
  console.log(`Scraping URL: ${url}`);

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }); // Added timeout for robustness
    await page.waitForLoadState('domcontentloaded'); // Stronger wait than just networkidle
    await page.waitForTimeout(2000); // Consider if this timeout is always necessary

    const language = await detectLanguage(page);
    const snippets = await gatherRelevantTexts(page, language);
    console.log(`Extracted ${snippets.length} snippets.`);

    return { snippets };
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
