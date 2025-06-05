import getRobotParser, { Robot } from '../robot/robot';
import { delay } from '../misc/misc';
import axios from 'axios';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';
import { XMLParser } from 'fast-xml-parser';
import zlib from 'zlib';

dotenv.config();

/**
 * Recursively parses a sitemap or sitemap index URL and extracts all reachable URLs.
 * @param sitemapUrl The URL of the sitemap (or sitemap index) to parse.
 * @param visitedUrls A Set to keep track of already visited URLs to prevent infinite loops and duplicates.
 * @returns A Promise that resolves to an array of unique sitemap URLs.
 */
export async function parseSitemap(sitemapUrl: string, visitedUrls: Set<string>): Promise<string[]> {
  const sitemapUrls: string[] = [];

  // Add the current sitemap URL to visited to prevent re-fetching if it's encountered again
  if (visitedUrls.has(sitemapUrl)) {
    return []; // Already processed this sitemap, return empty
  }
  visitedUrls.add(sitemapUrl);

  try {
    const response = await axios.get(sitemapUrl, {
      timeout: 10000, // 10-second timeout
      responseType: 'arraybuffer', // Crucial for handling binary data (like gzip)
      headers: {
        'Accept-Encoding': 'gzip, deflate' // Request compressed data if available
      }
    });

    let sitemapData: any;
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "",
      textNodeName: "#text"
    });

    if (response.headers['content-encoding'] === 'gzip') {
      // Handle gzipped content: buffer all data and then parse
      sitemapData = await new Promise((resolve, reject) => {
        const gunzip = zlib.createGunzip();
        const chunks: Buffer[] = [];

        gunzip.on('data', (chunk) => chunks.push(chunk));
        gunzip.on('end', () => {
          try {
            const unzippedData = Buffer.concat(chunks).toString('utf8');
            resolve(parser.parse(unzippedData));
          } catch (parseError: any) {
            reject(new Error(`Failed to parse unzipped XML from ${sitemapUrl}: ${parseError.message}`));
          }
        });
        gunzip.on('error', (err) => {
          reject(new Error(`Gunzip error for ${sitemapUrl}: ${err.message}`));
        });

        gunzip.end(response.data); // Pipe the compressed buffer to gunzip
      });
    } else {
      // Assume it's plain XML
      sitemapData = parser.parse(response.data.toString('utf8'));
    }

    // Check if it's a sitemap index (contains other sitemaps)
    if (sitemapData.sitemapindex && sitemapData.sitemapindex.sitemap) {
      const sitemaps = Array.isArray(sitemapData.sitemapindex.sitemap)
        ? sitemapData.sitemapindex.sitemap
        : [sitemapData.sitemapindex.sitemap];

      for (const sitemapEntry of sitemaps) {
        if (sitemapEntry.loc) {
          // Recursive call for nested sitemaps
          const nestedUrls = await parseSitemap(sitemapEntry.loc, visitedUrls);
          sitemapUrls.push(...nestedUrls);
        }
      }
    }
    // Check if it's a regular sitemap (contains actual URLs)
    else if (sitemapData.urlset && sitemapData.urlset.url) {
      const urls = Array.isArray(sitemapData.urlset.url)
        ? sitemapData.urlset.url
        : [sitemapData.urlset.url];

      for (const urlEntry of urls) {
        if (urlEntry.loc) {
          const normalizedUrl = urlEntry.loc.toLowerCase();
          if (!visitedUrls.has(normalizedUrl) && !isFile(normalizedUrl)) {
            sitemapUrls.push(normalizedUrl);
            visitedUrls.add(normalizedUrl); // Add to visitedUrls here as well
          }
        }
      }
    } else {
      console.warn(`Sitemap ${sitemapUrl} has an unexpected structure.`);
    }
  } catch (error: any) {
    console.error(`Error parsing sitemap ${sitemapUrl}:`, error.message);
    // You might want to throw the error or return an empty array based on your error handling strategy
  }
  return sitemapUrls;
}

export async function getAllValidUrls(url: string) {
  const robot = await getRobotParser(url);
  let currentLevel = 1;
  let maxLevel = parseInt(process.env.MAX_SCRAPER_LEVEL as string) || 3;
  let crawlerDelay = robot.getCrawlDelay(url) ?? 0;
  let delayMs = crawlerDelay * 1000 || parseInt(process.env.SCRAPER_DELAY as string) || 1000;
  const visitedUrls = new Set<string>();
  const resultUrls: string[] = [];

  // 1. Try to get URLs from sitemaps defined in robots.txt
  const sitemapUrlsFromRobots = robot.getSitemaps();
  for (const sitemapUrl of sitemapUrlsFromRobots) {
    console.log(`[getAllValidUrls] Found sitemap in robots.txt: ${sitemapUrl}`);
    const urlsFromSitemap = await parseSitemap(sitemapUrl, visitedUrls);
    resultUrls.push(...urlsFromSitemap);
  }

  // 2. Start crawling from the initial URL if not already covered by sitemaps
  const initialUrlNormalized = new URL(url.toLowerCase()).toString();
  if (!visitedUrls.has(initialUrlNormalized) && !isFile(initialUrlNormalized)) {
    const crawledUrls = await getUrlsFromPage(
      initialUrlNormalized,
      currentLevel,
      maxLevel,
      delayMs,
      robot,
      visitedUrls,
    );
    resultUrls.push(...crawledUrls);
  } else if (visitedUrls.has(initialUrlNormalized)) {
    console.log(
      `[getAllValidUrls] Initial URL ${initialUrlNormalized} already processed via sitemap.`,
    );
  }

  // Now, also process the URLs found in the sitemap if they haven't been visited yet
  // This ensures that sitemap URLs also get their subpages crawled if they meet the criteria.
  // We iterate over the initially collected sitemap URLs and kick off getUrlsFromPage for them.
  // This part ensures that if a URL is found *only* in the sitemap, it still gets its subpages crawled up to maxLevel.
  for (const sitemapDiscoveredUrl of [...visitedUrls]) {
    // Iterate over a copy of visitedUrls to avoid issues with modification during iteration
    if (!resultUrls.includes(sitemapDiscoveredUrl)) {
      // If it's a URL from sitemap but not yet added to result from direct crawling
      const crawledSubUrls = await getUrlsFromPage(
        sitemapDiscoveredUrl,
        currentLevel, // Start crawling from level 1 for these sitemap URLs as well
        maxLevel,
        delayMs,
        robot,
        visitedUrls,
      );
      resultUrls.push(...crawledSubUrls);
    }
  }

  const resultsSet = new Set(resultUrls.filter(isValidUrl));
  return Array.from(resultsSet).sort();
}

function isValidUrl(url: string): boolean {
  const baseUrl = url.toLowerCase();
  const containsFile = isFile(baseUrl);
  const containsHash = baseUrl.includes('#');
  const containsQuery = baseUrl.includes('?');
  const isValid = !containsHash && !containsQuery && !containsFile;
  console.log(`[isValidUrl] ${url} is ${isValid ? 'valid' : 'invalid'}`);

  return isValid;
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
  const containsFile = isFile(baseUrl);
  const isHigherLevel = currentLevel > maxLevel;
  const alreadyVisitedBeforeCheck = visitedUrls.has(baseUrl); // Check before adding

  console.log(`[getUrlsFromPage] Processing page: ${baseUrl}`);
  console.log(`[getUrlsFromPage] pages visited: ${visitedUrls.size}`);
  console.log(`[getUrlsFromPage] for url ${baseUrl} level ${currentLevel}/${maxLevel}`);

  switch (true) {
    case isHigherLevel:
      console.warn('[getUrlsFromPage] Reached max level, skipping subpages: ', url);
      return result;
    case isNotAllowed:
      console.warn('[getUrlsFromPage] Disallowed by robots.txt, skipping subpages: ', url);
      return result;
    case containsFile:
      console.warn('[getUrlsFromPage] Image, skipping subpages: ', url);
      return result;
    case alreadyVisitedBeforeCheck: // Use the value before adding
      console.warn('[getUrlsFromPage] Already visited skipping page: ', url);
      return result;
  }

  visitedUrls.add(baseUrl); // Add after all checks that would skip processing

  if (isAllowed) {
    // No need to check !alreadyVisited here again
    addValidUrl(baseUrl, result); // Add the current URL to the result
    let childUrls = await getUrlsFromUrl(baseUrl); // Use baseUrl for consistency
    await logDelay(delayMs);

    const validChildUrls = await Promise.all(
      Array.from(new Set(childUrls)).map(async (childUrlCandidate) => {
        try {
          const absoluteChildUrl = new URL(childUrlCandidate, baseUrl).toString();
          const normalizedAbsoluteChildUrl = absoluteChildUrl.toLowerCase();

          if (
            new URL(normalizedAbsoluteChildUrl).origin === new URL(baseUrl).origin &&
            !visitedUrls.has(normalizedAbsoluteChildUrl)
          ) {
            return await getUrlsFromPage(
              normalizedAbsoluteChildUrl,
              currentLevel + 1,
              maxLevel,
              delayMs,
              robot,
              visitedUrls,
            );
          }
          return Promise.resolve([]);
        } catch (e) {
          console.error(`Error processing child URL ${childUrlCandidate} from ${baseUrl}:`, e);
          return Promise.resolve([]);
        }
      }),
    ).then((results) => results.flat());

    result.push(...validChildUrls);
  }

  return Array.from(new Set(result));
}

function addValidUrl(url: string, result: string[]) {
  console.log(`[getUrlsFromPage] Visiting page: ${url}`);
  result.push(url); // <-- Pushes the current URL to the result
  console.log(`[getUrlsFromPage] added: ${url}`);
  // No return here, as the function modifies the result array directly
}

async function logDelay(delayMs: number) {
  console.log(`[getUrlsFromPage] waiting ${delayMs} ms`);
  await delay(delayMs);
}

async function getUrlsFromUrl(url: string) {
  try {
    const res = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LinkCrawler/1.0)' },
      timeout: 10000,
      responseType: 'text',
    });
    if (!res.headers['content-type']?.includes('text/html')) {
      return [];
    }

    const $ = cheerio.load(res.data);
    const baseUrl = new URL(url);
    return $('a[href]')
      .map((_, el) => {
        const href = $(el).attr('href');
        if (href) {
          // Handle relative paths and absolute URLs
          try {
            const absoluteUrl = new URL(href, baseUrl).toString();
            return absoluteUrl;
          } catch (e) {
            console.warn(`Could not resolve URL: ${href} relative to ${baseUrl.toString()}`, e);
            return null; // Return null for invalid URLs
          }
        }
        return null;
      })
      .get()
      .filter(Boolean) as string[];
  } catch (error: any) {
    if (error.response?.status === 404) {
      console.warn(`[getUrlsFromUrl] URL not found (404): ${url}`);
      return [];
    }
    console.error(`[getUrlsFromUrl] Error fetching or parsing ${url}:`, error.message);
    return []; // Return empty array on other errors to allow continued processing
  }
}

function isFile(url: string) {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname.toLowerCase();
    // More comprehensive list of image extensions
    return /\.(jpg|jpeg|png|gif|bmp|webp|svg|tiff|ico|pdf)$/i.test(path);
  } catch {
    return false;
  }
}