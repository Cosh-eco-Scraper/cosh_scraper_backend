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
      return b.score - a.score;
    }
    return a.snippet.length - b.snippet.length;
  });

  return scored.map((s) => s.snippet);
}

function deduplicateSnippets(
  snippets: string[],
  similarityThreshold = 0.85,
  maxChars = 1000000,
): string[] {
  const unique: string[] = [];

  for (const snippet of snippets) {
    const cleaned = snippet.replace(/\s+/g, ' ').trim();
    if (!cleaned || cleaned.length < 30) {
      continue;
    }

    const isSimilar = unique.some((existing) => {
      const dist = distance(cleaned, existing);
      const maxLen = Math.max(cleaned.length, existing.length);
      return dist / maxLen < 1 - similarityThreshold;
    });

    if (!isSimilar) {
      unique.push(cleaned);
    }

    const currentCharCount = unique.reduce((sum, s) => sum + s.length, 0);
    if (currentCharCount > maxChars) {
      break;
    }
  }

  return unique;
}

async function extractRelevantSnippets(page: Page, language: string): Promise<string[]> {
  const keywords = getKeywords(language);
  const keywordRegex = new RegExp(keywords.join('|'), 'i');

  const title = await page.title();
  const metaDescription = await page
    .$eval(
      'meta[name="description"]',
      (el: Element) => (el as HTMLMetaElement).getAttribute('content'),
      { timeout: 2000 },
    )
    .catch(() => '');

  const blocks = await page.$$eval(
    'section, article, div, ul, ol, li, tr',
    (elements: Element[], keywordRegexStr: string) => {
      const regex = new RegExp(keywordRegexStr, 'i');
      return elements
        .map((el) => (el as HTMLElement).innerText?.trim() || '')
        .filter(Boolean)
        .filter((text: string) => regex.test(text) && text.length > 0 && text.length < 2000);
    },
    keywordRegex.source,
  );

  const directSnippets = await page.$$eval(
    'h1, h2, h3, h4, h5, h6, p, span, li, td, th, tr',
    (elements: Element[], keywordRegexStr: string) => {
      const regex = new RegExp(keywordRegexStr, 'i');
      return elements
        .map((el) => el.textContent?.trim() || '')
        .filter(Boolean)
        .filter((text: string) => regex.test(text) && text.length > 0 && text.length < 500);
    },
    keywordRegex.source,
  );

  const allSnippets = [title, metaDescription, ...blocks, ...directSnippets]
    .map((s: string | null) => (s ?? '').trim())
    .filter(Boolean);

  const uniqueSnippets = deduplicateSnippets(allSnippets);

  const rankedSnippets = rankSnippetsByKeywordMatch(uniqueSnippets, keywords);

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
