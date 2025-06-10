// linkCrawler/linkCrawler.ts

import getRobotParser, { Robot } from '../robot/robot';
import { delay } from '../misc/misc';
import axios from 'axios';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';
import { XMLParser } from 'fast-xml-parser';
import zlib from 'zlib';

dotenv.config();

// --- Configuration for URL Filtering ---
const URL_BLACKLIST_PATTERNS: string[] = [
  '#', // Internal anchors (should be filtered earlier, but good safety)
  'javascript:', // Javascript pseudo-links
  'mailto:', // Mailto links
  'tel:', // Telephone links
  'ftp:', // FTP links
  '/login',
  '/signin',
  '/signup',
  '/register',
  '/cart',
  '/checkout',
  '/privacy-policy',
  '/terms-of-service',
  '/legal',
  '/cookie-policy',
  '/sitemap.xml', // Already handled by robots.txt discovery, no need to crawl as page
  '/feed', // RSS feeds
  '/rss',
  '/atom',
  '/xmlrpc.php',
  '/wp-admin',
  '/wp-login.php',
  '/search', // Often large number of irrelevant URLs

  // --- NEW AGGRESSIVE BLACKLIST PATTERNS to reduce crawl size ---
  // These patterns target common URL structures for product pages, category listings, and blog content.
  // They are applied *after* the explicit inclusion whitelist, so your 'winkel' pages will be safe.
  '/product/', // Common for individual product detail pages (e.g., /product/abc-123)
  '/products/', // Common for product listing/category pages (e.g., /products/electronics)
  '/item/', // Another common identifier for individual items
  '/detail/', // Common for product detail or article detail pages
  '/category/', // Category listing pages (e.g., /category/shoes)
  '/categories/',
  '/collection/', // E-commerce collection pages
  '/shop/', // General shop directories (be cautious if your desired 'winkels' pages contain this term, though 'explicitlyIncludedPaths' should protect them)
  '/blog/', // Blog posts and listings (e.g., /blog/my-great-article)
  '/news/', // News articles and listings
  '/article/', // Generic article paths
  '/post/', // Generic post paths
  '/tag/', // Tag pages (often very numerous)
  '/archive/', // Archive pages (e.g., blog archives by date)
  '/events/', // Event pages (if not desired)
  '/media/', // Common for image/video galleries or media assets
  '/assets/', // Static assets, often not content pages
  '/js/', // JavaScript files (though 'ALLOWED_PAGE_EXTENSIONS' also handles this)
  '/css/', // CSS files
  '/img/', // Image directories
  '/image/',
  '/download/', // Download links
  '/pdf/', // PDF document paths
  '.pdf', // Direct PDF file links (added to URL_BLACKLIST_PATTERNS as an alternative check)
  '.xml', // XML files (sitemaps are handled by parseSitemap)
  '.json', // JSON API endpoints
];

// Whitelist approach: Only these extensions are considered crawlable "pages"
// TIGHTENED: Focusing strictly on typical HTML-based content for text extraction.
const ALLOWED_PAGE_EXTENSIONS: string[] = [
  '', // For URLs with no extension (e.g., example.com/about)
  'html',
  'htm',
  'php',
  'asp',
  'aspx',
  'jsp',
  'cfm',
  // Removed 'js', 'json', 'xml' - these are often for data or functionality, not content pages.
  // If you need to scrape text from specific XML/JSON feeds, that's usually a separate process.
];

// Query parameters that should be removed for normalization purposes
// These are parameters that *do not* change the fundamental content of the page
// but are used for tracking, sorting, or simple pagination.
const IGNORED_QUERY_PARAMS: string[] = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'sessionid',
  'sid',
  'ref',
  'referrer',
  '_ga',
  '_gl',
  '_hsmi',
  '_hsenc',
  'gclid',
  'fbclid',
  's_kwcid',
  'mc_cid',
  'mc_eid',
  '_kx',
  'g_acct',
  'cid',
  'variant',
  'v',
  'page', // If 'page' only indicates pagination on a listing, it's ignored for content uniqueness.
  'p', // Same as 'page'
  'sort', // Sorting parameters rarely change the *content* drastically, just the order.
  'order',
  'view',
  'q', // Search query parameter. If /search is blacklisted, this is fine.
];

// --- Helper Functions ---

/**
 * Checks if a string is a syntactically valid URL.
 * @param url The string to check.
 * @returns True if the string can be parsed as a URL, false otherwise.
 */
function isValidUrlFormat(url: string): boolean {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return false;
  }
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function isProductPage(url: string): boolean {
  const productUrlPatterns = [
    /\/product\/\S+/,
    /\/products\/\S+/,
    /\/shop\/\S+\/\S+/,
    /\/item\/\S+/,
    /\/[a-z0-9-]+\-p-(\d+)\.html/, // eslint-disable-line
    /\/[a-z0-9-]+\-id-(\d+)\.html/, // eslint-disable-line
    /\/[a-z0-9-]+\/dp\/\w+/,
    /\/[a-zA-Z0-9-]+-\d+-\d+$/,
    /\/\d+$/,
    /\?.+/,
  ];
  for (const pattern of productUrlPatterns) {
    if (pattern.test(url)) {
      console.log(`  [DETECTED] Product page by URL pattern: "${pattern.source}"`);
      return true;
    }
  }

  return false;
}

/**
 * Normalizes a URL by converting to lowercase, removing ignored query parameters,
 * and standardizing trailing slashes and hash fragments.
 * @param url The URL string to normalize.
 * @returns The normalized URL string, or the original (lowercase) if normalization fails.
 */
function normalizeUrl(url: string): string {
  if (!isValidUrlFormat(url)) {
    console.warn(
      `[normalizeUrl] Input URL is not a valid format, returning lowercase original: '${url}'`,
    );
    return url.toLowerCase();
  }
  try {
    const urlObj = new URL(url);
    urlObj.hash = ''; // Remove hash fragment
    // Remove trailing slash if not root and no extension
    if (
      urlObj.pathname.endsWith('/') &&
      urlObj.pathname.length > 1 &&
      !urlObj.pathname.includes('.')
    ) {
      urlObj.pathname = urlObj.pathname.slice(0, -1);
    }
    const newSearchParams = new URLSearchParams();
    urlObj.searchParams.forEach((value, key) => {
      if (!IGNORED_QUERY_PARAMS.includes(key.toLowerCase())) {
        newSearchParams.append(key, value);
      }
    });
    urlObj.search = newSearchParams.toString();
    urlObj.searchParams.sort();
    return urlObj.toString().toLowerCase();
  } catch (e: any) {
    console.warn(`[normalizeUrl] Failed to normalize URL: ${url}. Error: ${e.message}`);
    return url.toLowerCase(); // Fallback to lowercase only
  }
}

function hasAllowedPageExtension(url: string): boolean {
  if (!isValidUrlFormat(url)) {
    return false;
  }
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    const lastDotIndex = path.lastIndexOf('.');
    if (lastDotIndex === -1 || lastDotIndex < path.lastIndexOf('/')) {
      return ALLOWED_PAGE_EXTENSIONS.includes(''); // Check for URLs with no extension
    }
    const extension = path.substring(lastDotIndex + 1).toLowerCase();
    const isAllowed = ALLOWED_PAGE_EXTENSIONS.includes(extension);
    return isAllowed;
  } catch {
    return false;
  }
}

function isBlacklistedUrl(url: string): boolean {
  // This now checks against URL_BLACKLIST_PATTERNS using String.prototype.includes()
  const isBlacklisted = URL_BLACKLIST_PATTERNS.some((pattern) => url.includes(pattern));
  return isBlacklisted;
}

function isValidUrl(url: string): boolean {
  // 0. Initial format check
  if (!isValidUrlFormat(url)) {
    // console.warn(`[shouldCrawlUrl] Reason: Invalid URL format. Skipping: ${url}`);
    return false;
  }

  // Normalize after initial format check
  const normalizedUrl = normalizeUrl(url);
  // console.log(`[shouldCrawlUrl] Normalized: ${normalizedUrl}`);

  // 1. Basic non-web protocol/pseudo-link checks
  if (
    normalizedUrl.startsWith('javascript:') ||
    normalizedUrl.startsWith('mailto:') ||
    normalizedUrl.startsWith('tel:') ||
    normalizedUrl.startsWith('ftp:') ||
    normalizedUrl.startsWith('data:')
  ) {
    // console.warn(`[shouldCrawlUrl] Reason: Non-web protocol or pseudo-link. Skipping: ${normalizedUrl}`);
    return false;
  }

  const explicitlyIncludedPaths = [
    /(winkels|winkels\/.+|contact|over-ons)\/?$/i, // Dutch: stores, contact, about us
    /(geschaefte|filialen|standorte|kontakt|ueber-uns)\/?$/i, // German: stores, branches, locations, contact, about us
    /(stores|locations|shops|contact|about-us)\/?$/i, // English: stores, locations, shops, contact, about us
    /(magasins|boutiques|emplacements|contact|a-propos)\/?$/i, // French: stores, shops, locations, contact, about us
    /(contact|about-us|over-ons)\/?$/i, // Root level common terms, if not language-specific
  ];

  const pathName = new URL(normalizedUrl).pathname;
  if (explicitlyIncludedPaths.some((pattern) => pattern.test(pathName))) {
    return true;
  }

  if (isBlacklistedUrl(normalizedUrl)) {
    return false;
  }

  // 5. File extension check (only allow web pages, applies AFTER explicit inclusions)
  if (!hasAllowedPageExtension(normalizedUrl)) {
    return false;
  }

  if (isProductPage(normalizedUrl)) {
    return false;
  }

  return true;
}

function shouldCrawlUrl(
  url: string,
  baseUrlOrigin: string,
  robot: Robot,
  visitedUrls: Set<string>,
): boolean {
  // console.log(`\n--- [shouldCrawlUrl] Evaluating: ${url} ---`); // Uncomment for verbose debugging

  // 0. Initial format check
  if (!isValidUrlFormat(url)) {
    // console.warn(`[shouldCrawlUrl] Reason: Invalid URL format. Skipping: ${url}`);
    return false;
  }

  // Normalize after initial format check
  const normalizedUrl = normalizeUrl(url);
  // console.log(`[shouldCrawlUrl] Normalized: ${normalizedUrl}`);

  // 1. Basic non-web protocol/pseudo-link checks
  if (
    normalizedUrl.startsWith('javascript:') ||
    normalizedUrl.startsWith('mailto:') ||
    normalizedUrl.startsWith('tel:') ||
    normalizedUrl.startsWith('ftp:') ||
    normalizedUrl.startsWith('data:')
  ) {
    // console.warn(`[shouldCrawlUrl] Reason: Non-web protocol or pseudo-link. Skipping: ${normalizedUrl}`);
    return false;
  }

  // 2. Check if already visited (crucial for efficiency)
  if (visitedUrls.has(normalizedUrl)) {
    // console.warn(`[shouldCrawlUrl] Reason: Already visited (after normalization). Skipping: ${normalizedUrl}`);
    return false;
  }

  // 3. Same origin check (avoid external links)
  try {
    const urlOrigin = new URL(normalizedUrl).origin;
    if (urlOrigin !== baseUrlOrigin) {
      // console.warn(`[shouldCrawlUrl] Reason: Different origin. Skipping: ${normalizedUrl} (from ${baseUrlOrigin})`);
      return false;
    }
  } catch {
    // console.warn(`[shouldCrawlUrl] Reason: Unexpected URL parsing error for origin check. Skipping: ${normalizedUrl}. Error: ${e.message}`);
    return false;
  }

  // --- Explicit INCLUSION for known important paths (Whitelist) ---
  // This takes precedence over blacklists and extension checks below.
  // Add specific patterns for pages you *definitely* want to crawl,
  // such as store locators, contact pages, about pages, etc.
  // These are often language-prefixed or have very specific structures.
  const explicitlyIncludedPaths = [
    /^\/nl\/(winkels|winkels\/.+|contact|over-ons)\/?$/i, // Dutch: stores, contact, about us
    /^\/de\/(geschaefte|filialen|standorte|kontakt|ueber-uns)\/?$/i, // German: stores, branches, locations, contact, about us
    /^\/en\/(stores|locations|shops|contact|about-us)\/?$/i, // English: stores, locations, shops, contact, about us
    /^\/fr\/(magasins|boutiques|emplacements|contact|a-propos)\/?$/i, // French: stores, shops, locations, contact, about us
    /^\/(contact|about-us|over-ons)\/?$/i, // Root level common terms, if not language-specific
  ];

  const pathName = new URL(normalizedUrl).pathname;
  if (explicitlyIncludedPaths.some((pattern) => pattern.test(pathName))) {
    // console.log(`[shouldCrawlUrl] Reason: Explicitly whitelisted path. Including: ${normalizedUrl}`);
    visitedUrls.add(normalizedUrl); // Mark as visited and include
    return true;
  }
  // --- END Explicit INCLUSION ---

  // 4. Blacklisted patterns (applies AFTER explicit inclusions)
  // This is where generic undesirable paths are filtered out.
  if (isBlacklistedUrl(normalizedUrl)) {
    // console.warn(`[shouldCrawlUrl] Reason: Blacklisted pattern found. Skipping: ${normalizedUrl}`);
    return false;
  }

  // 5. File extension check (only allow web pages, applies AFTER explicit inclusions)
  if (!hasAllowedPageExtension(normalizedUrl)) {
    // console.warn(`[shouldCrawlUrl] Reason: Disallowed file extension. Skipping: ${normalizedUrl}`);
    return false;
  }

  // 6. Robots.txt checks (robot object is always available here, applies LAST)
  if (robot.isDisallowed(normalizedUrl)) {
    // console.warn(`[shouldCrawlUrl] Reason: Disallowed by robots.txt. Skipping: ${normalizedUrl}`);
    return false;
  }

  // If all checks pass, add to visited set
  visitedUrls.add(normalizedUrl);
  // console.log(`[shouldCrawlUrl] Status: PASSED ALL GENERAL CHECKS. Added to visitedUrls. Processing: ${normalizedUrl}`);
  return true;
}

/**
 * Recursively parses a sitemap or sitemap index URL and extracts all reachable URLs.
 * @param sitemapUrl The URL of the sitemap (or sitemap index) to parse.
 * @param visitedUrls A Set to keep track of already visited URLs to prevent infinite loops and duplicates.
 * @param baseUrlOrigin The origin of the main site being crawled.
 * @param robot The Robot object for robots.txt rules.
 * @returns A Promise that resolves to an array of unique sitemap URLs.
 */
export async function parseSitemap(
  sitemapUrl: string,
  visitedUrls: Set<string>,
  baseUrlOrigin: string,
  robot: Robot,
): Promise<string[]> {
  const sitemapUrls: string[] = [];

  if (!isValidUrlFormat(sitemapUrl)) {
    console.error(`[parseSitemap] Invalid sitemap URL format, skipping: ${sitemapUrl}`);
    return [];
  }

  const normalizedSitemapUrl = normalizeUrl(sitemapUrl);

  if (visitedUrls.has(normalizedSitemapUrl)) {
    console.log(`[parseSitemap] Skipping already processed sitemap: ${normalizedSitemapUrl}`);
    return [];
  }
  visitedUrls.add(normalizedSitemapUrl); // Mark sitemap URL itself as visited
  console.log(`[parseSitemap] Processing sitemap: ${normalizedSitemapUrl}`);

  try {
    const response = await axios.get(sitemapUrl, {
      timeout: 10000,
      responseType: 'arraybuffer',
      headers: { 'Accept-Encoding': 'gzip, deflate' },
    });

    let xmlString: string;
    if (response.headers['content-encoding'] === 'gzip') {
      xmlString = await new Promise((resolve, reject) => {
        // eslint-disable-next-line no-undef
        zlib.gunzip(response.data as Buffer, (err, dezipped) => {
          if (err) {
            return reject(new Error(`Gunzip error for ${sitemapUrl}: ${err.message}`));
          }
          const unzippedData = dezipped.toString('utf8');
          if (!unzippedData.trim()) {
            reject(new Error(`Decompressed data for ${sitemapUrl} is empty.`));
          } else {
            resolve(unzippedData);
          }
        });
      });
    } else {
      xmlString = response.data.toString('utf8');
      if (!xmlString.trim()) {
        throw new Error(`Response data for ${sitemapUrl} is empty.`);
      }
    }

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      textNodeName: '#text',
    });
    let sitemapData: any;

    try {
      sitemapData = parser.parse(xmlString);
    } catch (parseError: any) {
      throw new Error(`XML parsing failed for ${sitemapUrl}: ${parseError.message}`);
    }

    if (sitemapData.sitemapindex && sitemapData.sitemapindex.sitemap) {
      const sitemaps = Array.isArray(sitemapData.sitemapindex.sitemap)
        ? sitemapData.sitemapindex.sitemap
        : [sitemapData.sitemapindex.sitemap];

      for (const sitemapEntry of sitemaps) {
        if (sitemapEntry.loc) {
          const nestedUrls = await parseSitemap(
            sitemapEntry.loc,
            visitedUrls,
            baseUrlOrigin,
            robot,
          );
          sitemapUrls.push(...nestedUrls);
        }
      }
    } else if (sitemapData.urlset && sitemapData.urlset.url) {
      const urls = Array.isArray(sitemapData.urlset.url)
        ? sitemapData.urlset.url
        : [sitemapData.urlset.url];

      for (const urlEntry of urls) {
        if (urlEntry.loc) {
          // --- CHANGE: Filter URLs from sitemap directly here ---
          if (shouldCrawlUrl(urlEntry.loc, baseUrlOrigin, robot, visitedUrls)) {
            sitemapUrls.push(normalizeUrl(urlEntry.loc));
          } else {
            // console.log(`[parseSitemap] Skipping URL from sitemap (filter): ${urlEntry.loc}`);
          }
        }
      }
    } else {
      console.warn(`Sitemap ${sitemapUrl} has an unrecognized or invalid structure after parsing.`);
    }
  } catch (error: any) {
    console.error(`Error processing sitemap ${sitemapUrl}: ${error.message}`);
  }
  return sitemapUrls;
}

export async function getAllValidUrls(url: string) {
  if (!isValidUrlFormat(url)) {
    console.error(`[getAllValidUrls] Initial URL is not a valid format: ${url}. Aborting crawl.`);
    return [];
  }

  const robot = await getRobotParser(url);
  const baseUrlOrigin = new URL(url).origin;
  let currentLevel = 1;
  let maxLevel = parseInt(process.env.MAX_SCRAPER_LEVEL as string) || 3;
  let crawlerDelay = robot.getCrawlDelay(url) ?? 0;
  let delayMs = crawlerDelay * 1000 || parseInt(process.env.SCRAPER_DELAY as string, 10) || 1000;
  const visitedUrls = new Set<string>(); // Tracks all URLs that have passed filters
  const finalResultUrls: string[] = []; // Only stores URLs that should be returned

  console.log(`\n--- [getAllValidUrls] START Crawl for: ${url} ---`);
  console.log(`[getAllValidUrls] Base URL Origin: ${baseUrlOrigin}`);
  console.log(`[getAllValidUrls] Max Level: ${maxLevel}, Delay: ${delayMs}ms`);
  console.log(`[getAllValidUrls] Initial visitedUrls size: ${visitedUrls.size}`);

  // 1. Get URLs from sitemaps defined in robots.txt
  const sitemapUrlsFromRobots = robot.getSitemaps();
  if (sitemapUrlsFromRobots.length > 0) {
    console.log(
      `[getAllValidUrls] Found sitemaps in robots.txt: ${sitemapUrlsFromRobots.join(', ')}`,
    );
    for (const sitemapUrl of sitemapUrlsFromRobots) {
      // parseSitemap now only returns valid URLs thanks to its internal `shouldCrawlUrl` filter
      const urlsFromSitemap = await parseSitemap(sitemapUrl, visitedUrls, baseUrlOrigin, robot);
      finalResultUrls.push(...urlsFromSitemap);
    }
    console.log(`[getAllValidUrls] URLs from sitemaps initially added: ${finalResultUrls.length}`);
  } else {
    console.log(`[getAllValidUrls] No sitemaps found in robots.txt.`);
  }
  const crawledUrls = await getUrlsFromPage(
    baseUrlOrigin,
    currentLevel,
    maxLevel,
    delayMs,
    robot,
    visitedUrls,
    baseUrlOrigin,
  );
  finalResultUrls.push(...crawledUrls);

  const crawledSubUrls = await getUrlsFromPage(
    baseUrlOrigin,
    currentLevel, // Treat these as next level crawls
    maxLevel,
    delayMs,
    robot,
    visitedUrls,
    baseUrlOrigin,
  );
  finalResultUrls.push(...crawledSubUrls);

  // The final list is already filtered and unique as URLs are added only after `shouldCrawlUrl` check.
  // A final `Set` conversion and sort ensure absolute uniqueness and order.
  const uniqueSortedResultUrls = Array.from(new Set(finalResultUrls)).filter(isValidUrl).sort();
  console.log(`\n--- [getAllValidUrls] END Crawl ---`);
  console.log(
    `[getAllValidUrls] Final count of valid unique URLs: ${uniqueSortedResultUrls.length}`,
  );
  return uniqueSortedResultUrls;
}

async function getUrlsFromPage(
  url: string,
  currentLevel: number,
  maxLevel: number,
  delayMs: number,
  robot: Robot,
  visitedUrls: Set<string>, // Passed to ensure `shouldCrawlUrl` has context
  baseUrlOrigin: string,
) {
  const resultForThisBranch: string[] = []; // URLs found in this branch of recursion

  const normalizedUrl = normalizeUrl(url);

  console.log(
    `\n--- [getUrlsFromPage] START Processing: ${normalizedUrl} (Level: ${currentLevel}/${maxLevel}) ---`,
  );
  console.log(`[getUrlsFromPage] Current visitedUrls size: ${visitedUrls.size}`);

  if (currentLevel > maxLevel) {
    console.warn(
      `[getUrlsFromPage] Reason: Reached max level (${maxLevel}). Skipping: ${normalizedUrl}`,
    );
    return resultForThisBranch;
  }

  if (visitedUrls.has(normalizedUrl) && !resultForThisBranch.includes(normalizedUrl)) {
    resultForThisBranch.push(normalizedUrl);
  } else if (!visitedUrls.has(normalizedUrl)) {
    console.error(
      `[getUrlsFromPage] ERROR: URL ${normalizedUrl} should be in visitedUrls but isn't! This indicates a logic error.`,
    );
    visitedUrls.add(normalizedUrl);
  }

  let childUrlsRaw = await getUrlsFromUrl(normalizedUrl);
  await logDelay(delayMs);

  const validChildUrlsToRecurse = new Set<string>();
  for (const childUrlCandidate of childUrlsRaw) {
    if (!isValidUrlFormat(childUrlCandidate)) {
      // console.warn(`[getUrlsFromPage] Skipping malformed child URL: ${childUrlCandidate}`);
      continue;
    }
    const absoluteChildUrl = new URL(childUrlCandidate, normalizedUrl).toString();

    if (shouldCrawlUrl(absoluteChildUrl, baseUrlOrigin, robot, visitedUrls)) {
      validChildUrlsToRecurse.add(absoluteChildUrl);
    }
  }

  const recursiveCrawlPromises = Array.from(validChildUrlsToRecurse).map(async (validChildUrl) => {
    return await getUrlsFromPage(
      validChildUrl,
      currentLevel + 1,
      maxLevel,
      delayMs,
      robot,
      visitedUrls,
      baseUrlOrigin,
    );
  });

  const validChildUrlsFromRecursion = (await Promise.all(recursiveCrawlPromises)).flat();
  resultForThisBranch.push(...validChildUrlsFromRecursion);

  console.log(
    `--- [getUrlsFromPage] END Processing: ${normalizedUrl}. Returning ${Array.from(new Set(resultForThisBranch)).length} URLs for this branch.---\n`,
  );
  return Array.from(new Set(resultForThisBranch)); // Return unique URLs for this branch
}

async function getUrlsFromUrl(url: string): Promise<string[]> {
  try {
    // console.log(`[getUrlsFromUrl] Attempting to fetch HTML from: ${url}`);
    const res = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LinkCrawler/1.0)' },
      timeout: 15000,
      responseType: 'text',
    });

    const contentType = res.headers['content-type'] || '';
    if (!contentType.includes('text/html')) {
      // console.warn(
      //   `[getUrlsFromUrl] Skipping non-HTML content for ${url}: Content-Type: ${contentType}`,
      // );
      return [];
    }
    // console.log(`[getUrlsFromUrl] Successfully fetched HTML for: ${url}`);

    const $ = cheerio.load(res.data);
    const baseUrl = new URL(url);
    const extractedUrls = $('a[href]')
      .map((_, el: any) => {
        const href = $(el).attr('href');
        if (href) {
          if (!isValidUrlFormat(href)) {
            return null;
          }
          try {
            const absoluteUrl = new URL(href, baseUrl).toString();
            return absoluteUrl;
          } catch (e: any) {
            console.warn(
              `[getUrlsFromUrl] Could not resolve URL: ${href} relative to ${baseUrl.toString()}: ${e.message}`,
            );
            return null;
          }
        }
        return null;
      })
      .get()
      .filter(Boolean) as string[];
    // console.log( `[getUrlsFromUrl] Finished extracting links from ${url}. Found ${extractedUrls.length} raw links.`);
    return extractedUrls;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.error(
          `[getUrlsFromUrl] HTTP Error for ${url}: Status ${error.response.status} - ${error.message}`,
        );
      } else if (error.request) {
        console.error(
          `[getUrlsFromUrl] Network Error for ${url}: No response received (Timeout/DNS/Connection) - ${error.message}`,
        );
      } else {
        console.error(
          `[getUrlsFromUrl] Axios config/request setup Error for ${url}: ${error.message}`,
        );
      }
    } else {
      console.error(`[getUrlsFromUrl] Generic Error fetching or parsing ${url}: ${error.message}`);
    }
    return [];
  }
}

async function logDelay(delayMs: number) {
  if (delayMs > 0) {
    // console.log(`[logDelay] Waiting ${delayMs} ms...`);
    await delay(delayMs);
    // console.log(`[logDelay] Resumed.`);
  } else {
    // console.log(`[logDelay] No delay (0ms).`);
  }
}
