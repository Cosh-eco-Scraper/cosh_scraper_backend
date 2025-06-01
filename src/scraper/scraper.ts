import { chromium, Page } from 'playwright';
import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
import { distance } from 'fastest-levenshtein';
import getPrompt from './prompt/prompt';

dotenv.config();
const ai = new GoogleGenAI({ apiKey: process.env.AI_API_KEY });

type ScrapedInfo = {
  url: string;
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

async function extractRelevantSnippets(page: Page): Promise<string[]> {
  const keywords = [
    'about',
    'about us',
    'intro',
    'brand',
    'brands',
    'location',
    'address',
    'open',
    'opening',
    'hour',
    'hours',
    'time',
    'times',
    'opening hours',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
    'closed',
    'return',
    'returns',
    'contact',
    'contacts',
  ];
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

async function openDropdowns(page: Page) {
  const dropdownSelectors = ['button', 'a', '[role="button"]', '[aria-haspopup="true"]'];
  for (const selector of dropdownSelectors) {
    const elements = await page.$$(selector);
    for (const el of elements) {
      const text = (await el.innerText().catch(() => ''))?.toLowerCase() || '';
      const aria = (await el.getAttribute('aria-label').catch(() => ''))?.toLowerCase() || '';
      if (text.includes('brand') || aria.includes('brand')) {
        try {
          await el.click({ force: true });
          await page.waitForTimeout(500);
        } catch (e) {
          console.error(`Failed to click on dropdown: ${e}`);
        }
      }
    }
  }
}

async function gatherRelevantTexts(page: Page): Promise<string[]> {
  await openDropdowns(page);
  const snippets = await extractRelevantSnippets(page);
  return snippets;
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
): Promise<{ snippets: string[] } | null> {
  console.log(`Scraping URL: ${url}`);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const snippets = await gatherRelevantTexts(page);
    console.log(`Extracted ${snippets.length} snippets.`);

    return { snippets }; // only snippets now
  } catch (error) {
    console.error('Error scraping URL:', url, error);

    return null;
  } finally {
    await browser.close();
  }
}

// (async () => {
//   const url = 'https://www.asadventure.com/nl.html'; // Here you can put the URL to test the scraper
//   const location = 'Brugge'; // Here you can put the location to test the scraper
//   const scrapedData = await scraper(url, location);
//   console.log(scrapedData);
// })();
