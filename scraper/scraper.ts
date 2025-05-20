import { chromium, Page } from 'playwright';
import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";

dotenv.config();
const ai = new GoogleGenAI({ apiKey: process.env.AI_API_KEY });

type ScrapedInfo = {
    url: string;
    brands: string[];
    openingHours: {
        "monday": { "open": string, "close": string } | null,
        "tuesday": { "open": string, "close": string } | null,
        "wednesday": { "open": string, "close": string } | null,
        "thursday": { "open": string, "close": string } | null,
        "friday": { "open": string, "close": string } | null,
        "saturday": { "open": string, "close": string } | null,
        "sunday": { "open": string, "close": string } | null,
    };
    location: string;
    about: string;
};

async function getAllInternalLinks(page: Page): Promise<string[]> {
    const baseUrl = new URL(page.url()).origin;
    const hrefs = await page.$$eval('a[href]', anchors =>
        Array.from(anchors)
            .map(a => (a as HTMLAnchorElement).href)
            .filter(Boolean)
    );
    const internalLinks = hrefs
        .filter(href => href.startsWith(baseUrl))
        .filter(href => !href.startsWith('mailto:') && !href.startsWith('tel:'))
        .filter((href, i, arr) => arr.indexOf(href) === i);
    return internalLinks;
}


async function extractRelevantSnippets(page: Page): Promise<string[]> {
    const keywords = [
        'about', 'over ons', 'about us', 'intro',
        'brand', 'merk', 'merken',
        'location', 'locatie', 'adres', 'address',
        'open', 'opening', 'hour', 'uur', 'tijd', 'time', 'openingstijden', 'opening hours',
        'openingsuren', 'opening hours',
        'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
        'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag', 'gesloten',
    ];
    const keywordRegex = new RegExp(keywords.join('|'), 'i');

    const title = await page.title();
    const metaDescription = await page.$eval('meta[name="description"]', el => el.getAttribute('content'), { timeout: 2000 }).catch(() => '');

    const blocks = await page.$$eval('section, article, div, ul, ol', (elements, keywordRegexStr) => {
        const regex = new RegExp(keywordRegexStr, 'i');
        return elements
            .map(el => (el as HTMLElement).innerText?.trim() || '')
            .filter(Boolean)
            .filter(text => regex.test(text) && text.length > 0 && text.length < 2000);
    }, keywordRegex.source);

    const directSnippets = await page.$$eval('h1, h2, h3, h4, h5, h6, p, span, li, td, th, tr', (elements, keywordRegexStr) => {
        const regex = new RegExp(keywordRegexStr, 'i');
        return elements
            .map(el => el.textContent?.trim() || '')
            .filter(Boolean)
            .filter(text => regex.test(text) && text.length > 0 && text.length < 500);
    }, keywordRegex.source);

    const allSnippets = [title, metaDescription, ...blocks, ...directSnippets]
        .map(s => (s ?? '').trim())
        .filter(Boolean);

    return Array.from(new Set(allSnippets));
}

async function openDropdowns(page: Page) {
    const dropdownSelectors = [
        'button', 'a', '[role="button"]', '[aria-haspopup="true"]'
    ];
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
    const visited = new Set<string>();
    const snippets: string[] = [];

    let internalLinks: string[] = [];
    try {
        internalLinks = await getAllInternalLinks(page);
    } catch (e) {
        internalLinks = [];
    }
    const toVisit = [page.url(), ...internalLinks.filter(link => link !== page.url())].slice(0, 10);

    for (const url of toVisit) {
        if (visited.has(url)) continue;
        visited.add(url);

        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
            await openDropdowns(page);
            const pageSnippets = await extractRelevantSnippets(page);
            snippets.push(...pageSnippets);
        } catch (e) {
            console.error(`Error visiting ${url}:`, e);
            continue;
        }
    }
    return Array.from(new Set(snippets));
}

const sendPrompt = async (prompt: string): Promise<string | undefined> => {
    const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
    });
    console.log(response.text);
    return response.text;
}

async function summarizeRelevantInfoWithAI(url: string, snippets: string[]): Promise<ScrapedInfo | null> {
    const prompt = `
The website URL is: ${url}

Given the following relevant text snippets from a shop website, extract and summarize the following fields as a JSON object:

{
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
  "about": string
}

Instructions:
- For "brands", extract all brand names mentioned in the snippets. If none are found, return an empty array.
- For "openingHours", if a day is marked as "gesloten", "closed", or any other non-time value, set both "open" and "close" to "closed". Only use an object with "open" and "close" if there are actual times.
- For "location" and "about", extract the relevant information.


Snippets:
${snippets.map((s, i) => `[${i + 1}] ${s}`).join('\n')}

Respond ONLY with the JSON object.
    `.trim();
    console.log('Prompt:', prompt); // Remove this if you don't want see the whole prompt
    const aiResponse = await sendPrompt(prompt);
    if (!aiResponse) return null;

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

export async function scraper(url: string): Promise<ScrapedInfo | null> {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded' });

        const snippets = await gatherRelevantTexts(page);

        const aiSummary = await summarizeRelevantInfoWithAI(url, snippets);
        return aiSummary;

    } catch (e) {
        console.error(`Error scraping ${url}:`, e);
        return null;
    } finally {
        await page.close();
        await context.close();
        await browser.close();
    }
}

(async () => {
    const url = 'https://www.blabloom.com/nl/'; // Here you can put the URL to test the scraper
    const scrapedData = await scraper(url);
    console.log(scrapedData);
})();