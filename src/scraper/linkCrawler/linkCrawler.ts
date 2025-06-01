import getRobotParser, { Robot } from '../robot/robot';
import { delay } from '../misc/misc';
import axios from 'axios';
import * as cheerio from 'cheerio';

export async function getAllValidUrls(url: string) {
  const robot = await getRobotParser(url);
  let currentLevel = 1;
  let maxLevel = parseInt(process.env.MAX_SCRAPER_LEVEL as string) || 3;
  let crawlerDelay = robot.getCrawlDelay(url) ?? 0;
  let delayMs = crawlerDelay * 1000 || parseInt(process.env.SCRAPER_DELAY as string) || 1000;

  return await getUrlsFromPage(
    new URL(url.toLowerCase()).toString(),
    currentLevel,
    maxLevel,
    delayMs,
    robot,
    new Set<string>(),
  );
}

async function getUrlsFromPage(
  url: string,
  currentLevel: number,
  maxLevel: number,
  delayMs: number,
  robot: Robot,
  visitedUrls: Set<string>,
) {
  const result: string[] = [];

  const baseUrl = url.toLowerCase();
  const isAllowed = robot.isAllowed(baseUrl);
  const isNotAllowed = robot.isDisallowed(baseUrl);

  if (currentLevel > maxLevel) {
    console.warn('[getUrlsFromPage] Reached max level, skipping subpages: ', url);
    return result;
  }

  if (isNotAllowed) {
    console.warn('[getUrlsFromPage] Disallowed by robots.txt, skipping subpages: ', url);
    return result;
  }

  if ((isAllowed || !isNotAllowed) && !visitedUrls.has(baseUrl)) {
    visitedUrls.add(baseUrl);
    const validUrl = addValidUrl(baseUrl, result);
    let childUrls = await getUrlsFromUrl(validUrl);
    await logDelay(delayMs);
    const validUrls = await Promise.all(
      Array.from(new Set(childUrls)).map(async (url) => {
        try {
          const childUrl = new URL(url, validUrl).toString();
          if (
            new URL(childUrl).origin === new URL(validUrl).origin &&
            !visitedUrls.has(childUrl.toLowerCase())
          ) {
            return await getUrlsFromPage(
              childUrl,
              currentLevel + 1,
              maxLevel,
              delayMs,
              robot,
              visitedUrls,
            );
          }
          return Promise.resolve([]);
        } catch {
          return Promise.resolve([]);
        }
      }),
    ).then((results) => results.flat());

    result.push(...validUrls);
  }

  return Array.from(new Set(result)) as string[];
}

function addValidUrl(url: string, result: string[]) {
  console.log(`[getUrlsFromPage] Visiting page: ${url}`);
  result.push(url);
  console.log(`[getUrlsFromPage] added: ${url}`);
  return url;
}

async function logDelay(delayMs: number) {
  console.log(`[getUrlsFromPage] waiting ${delayMs} ms`);
  await delay(delayMs);
}

async function getUrlsFromUrl(url: string) {
  const res = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LinkCrawler/1.0)' },
    timeout: 10000,
    responseType: 'text',
  });
  if (!res.headers['content-type']?.includes('text/html')) {
    return [];
  }

  const $ = cheerio.load(res.data);
  return $('a[href]')
    .map((_, el) => $(el).attr('href'))
    .get()
    .filter(Boolean) as string[];
}
