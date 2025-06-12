import { Page } from 'playwright';
import * as dotenv from 'dotenv';
import getPrompt from './prompt/prompt';
import getKeywords from './keywords'; // This now returns KeywordConfig
import { LLMService } from '../services/llm.service';
import { ScrapedInfo } from './domain/ScrapedInfo';

dotenv.config();

/**
 * --- Utility Functions ---
 */

/**
 * Detects the language of the page by checking the 'lang' attribute of the html tag
 * or the 'content-language' meta tag. Defaults to 'en' if not found.
 * @param {Page} page - The Playwright Page object.
 * @returns {Promise<string>} The detected language code (e.g., 'en', 'fr').
 */
async function detectLanguage(page: Page): Promise<string> {
  const htmlLang = await page.$eval('html', (el: HTMLElement) => el.getAttribute('lang') || '');
  if (htmlLang) {
    return htmlLang.split('-')[0].toLowerCase();
  }

  const metaLang = await page
    .$eval(
      'meta[http-equiv="content-language"]',
      (el: HTMLMetaElement) => el.getAttribute('content') || '',
    )
    .catch(() => '');

  if (metaLang) {
    return metaLang.split('-')[0].toLowerCase();
  }

  return 'en'; // Default to English if no language detected
}

/**
 * Configures Playwright to block unnecessary resources (images, stylesheets, fonts)
 * to speed up page loading.
 * @param {Page} page - The Playwright Page object.
 */
async function blockUnnecessaryResources(page: Page): Promise<void> {
  await page.route('**/*', (route) => {
    const blockedResources = ['image', 'stylesheet', 'font'];
    if (blockedResources.includes(route.request().resourceType())) {
      route.abort();
    } else {
      route.continue();
    }
  });
}

/**
 * Clicks common "load more", "show more", or "read more" buttons
 * to dynamically reveal more content on the page.
 * It attempts clicks in iterations, checking for content changes.
 *
 * @param {Page} page - The Playwright Page object.
 * @returns {Promise<void>}
 */
export async function clickInteractiveButtons(page: Page): Promise<void> {
  console.log('Attempting to click interactive buttons to reveal more content...');

  const clickSelectors = [
    // Common "Load More" / "View More" / "Show More" buttons
    'button:has-text("Load More")',
    'button:has-text("View More")',
    'button:has-text("Show More")',
    'a:has-text("Load More")',
    'a:has-text("View More")',
    'a:has-text("Show More")',
    'button:has-text("Mehr laden")', // German
    'button:has-text("Toon meer")', // Dutch
    'button:has-text("Plus afficher")', // French

    // Common "Read More" / "Expand" buttons
    'button:has-text("Read More")',
    'a:has-text("Read More")',
    'button:has-text("Lees meer")', // Dutch
    'a:has-text("Lees meer")', // Dutch
    'button:has-text("Meer lezen")', // Dutch
    'a:has-text("Meer lezen")', // Dutch
    'button:has-text("Erweitern")', // German
    'button:has-text("En savoir plus")', // French

    // Generic expand/collapse buttons based on common attributes
    'div.expand-button',
    'div[role="button"][aria-expanded="false"]',
    '[class*="button"][class*="load-more"]',
    '[class*="button"][class*="show-more"]',
    '[class*="button"][class*="read-more"]',
  ];

  const maxClickIterations = 3; // Maximum number of times to try clicking and checking for new content
  const clickTimeout = 2000; // Shorter timeout for individual click actions (milliseconds)
  const postClickWait = 500; // Small wait after clicks for content to render (milliseconds)

  for (let i = 0; i < maxClickIterations; i++) {
    let buttonsFoundAndClickedThisIteration = 0;
    // eslint-disable-next-line no-undef
    let initialScrollHeight = await page.evaluate(() => document.body.scrollHeight);
    let initialElementCount = await page.evaluate(
      // eslint-disable-next-line no-undef
      () => document.body.getElementsByTagName('*').length,
    );

    const clickPromises: Promise<void>[] = [];

    for (const selector of clickSelectors) {
      // Find all visible buttons matching the selector without waiting too long for them
      // Use allSettled for promises to allow some clicks to fail without stopping others
      const elements = await page.locator(selector).all();

      for (const el of elements) {
        try {
          // Use a very short timeout to check visibility quickly
          if (await el.isVisible({ timeout: 100 })) {
            // Push click promise to array, but catch errors to prevent Promise.all from failing
            clickPromises.push(
              el.click({ timeout: clickTimeout }).catch((_) => {
                // console.warn(`Failed to click element with selector "${selector}" (Error: ${clickError.message}).`);
                // Suppress excessive logs for failed clicks
              }),
            );
            buttonsFoundAndClickedThisIteration++;
          }
        } catch {
          console.warn('No visible interactive buttons found.');
          // Element not visible within 100ms, skip it for this iteration
        }
      }
    }

    if (buttonsFoundAndClickedThisIteration > 0) {
      console.log(
        `Iteration ${i + 1}: Attempting to click ${buttonsFoundAndClickedThisIteration} potential buttons.`,
      );
      // Wait for all initiated click actions to either complete or timeout
      await Promise.allSettled(clickPromises); // Use allSettled to ensure all promises run

      // Wait for DOM to settle and give content a moment to load
      await page.waitForLoadState('domcontentloaded').catch(() => {}); // Don't throw if already loaded
      await page.waitForTimeout(postClickWait); // Small pause for rendering

      // eslint-disable-next-line no-undef
      let newScrollHeight = await page.evaluate(() => document.body.scrollHeight);
      let newElementCount = await page.evaluate(
        // eslint-disable-next-line no-undef
        () => document.body.getElementsByTagName('*').length,
      );

      if (newScrollHeight > initialScrollHeight || newElementCount > initialElementCount) {
        console.log(
          `Content potentially changed in iteration ${i + 1} (Scroll: ${newScrollHeight - initialScrollHeight}px, Elements: ${newElementCount - initialElementCount}). Retrying...`,
        );
        // Continue to next iteration if content changed
      } else {
        console.log(
          `No significant content change after iteration ${i + 1}. Stopping further clicks.`,
        );
        break; // No new content, stop clicking
      }
    } else {
      console.log(`No more visible interactive buttons found in iteration ${i + 1}. Stopping.`);
      break; // No buttons to click, stop
    }
  }
  console.log('Finished attempting to click interactive buttons.');
}

/**
 * Extracts the full text content from the main content elements of the page, excluding scripts and styles.
 * @param {Page} page - The Playwright Page object.
 * @returns {Promise<string>} The concatenated and cleaned text content of the page.
 */
async function extractPageText(page: Page): Promise<string> {
  const pageText = await page.evaluate(() => {
    // Select common elements that typically contain main content
    // Avoid scripts and styles as they are not readable content
    const selectors = 'body *:not(script):not(style):not(noscript)';
    let fullText = '';
    // eslint-disable-next-line no-undef
    document.querySelectorAll(selectors).forEach((element: Element) => {
      // Explicitly type element
      // eslint-disable-next-line no-undef
      const computedStyle = window.getComputedStyle(element);
      if (
        computedStyle.display !== 'none' &&
        computedStyle.visibility !== 'hidden' &&
        element.textContent?.trim()
      ) {
        const text = element.textContent?.trim();
        if (text) {
          fullText += text + ' ';
        }
      }
    });
    return fullText.replace(/\s+/g, ' ').trim();
  });
  return pageText;
}

/**
 * Finds contexts around specified keywords within the page text.
 * Handles both single-word and multi-word keywords.
 * @param {string} pageText - The full text content of the page.
 * @param {string[]} keywordsToUse - An array of keywords to find context for.
 * @param {Record<string, number>} [wordsBeforeMap] - Optional map for keyword-specific wordsBefore.
 * @param {Record<string, number>} [wordsAfterMap] - Optional map for keyword-specific wordsAfter.
 * @returns {Record<string, string[]>} A dictionary of keyword to list of contexts.
 */
function findKeywordContexts(
  pageText: string,
  keywordsToUse: string[],
  wordsBeforeMap?: Record<string, number>,
  wordsAfterMap?: Record<string, number>,
): Record<string, string[]> {
  const keywordContexts: Record<string, string[]> = {};
  const words = pageText.split(/\s+/);

  for (const keyword of keywordsToUse) {
    const keywordLower = keyword.toLowerCase();
    const contextsForKeyword: string[] = [];

    const currentWordsBefore = wordsBeforeMap?.[keywordLower] ?? 50;
    const currentWordsAfter = wordsAfterMap?.[keywordLower] ?? 100;

    const keywordWords = keywordLower.split(' '); // For multi-word keywords

    for (let i = 0; i < words.length; i++) {
      let isMatch = true;
      if (keywordWords.length > 1) {
        // Handle multi-word keywords
        for (let j = 0; j < keywordWords.length; j++) {
          if (i + j >= words.length || words[i + j].toLowerCase() !== keywordWords[j]) {
            isMatch = false;
            break;
          }
        }
      } else {
        // Handle single-word keywords
        if (words[i].toLowerCase() !== keywordLower) {
          isMatch = false;
        }
      }

      if (isMatch) {
        const startIndex = Math.max(0, i - currentWordsBefore);
        const endIndex = Math.min(words.length, i + keywordWords.length + currentWordsAfter); // Adjust endIndex for multi-word

        const contextWords = words.slice(startIndex, endIndex);
        contextsForKeyword.push(contextWords.join(' '));

        // Skip words already matched in this keyword for the next iteration
        if (keywordWords.length > 1) {
          i += keywordWords.length - 1;
        }
      }
    }

    if (contextsForKeyword.length > 0) {
      keywordContexts[keyword] = contextsForKeyword;
    }
  }
  return keywordContexts;
}

/**
 * Validates the structure and content of a ScrapedInfo object.
 * Throws an error if critical fields are missing or malformed.
 * Issues warnings for less critical but missing/malformed fields.
 * @param {ScrapedInfo} parsed - The parsed ScrapedInfo object from the AI response.
 * @returns {boolean} True if validation passes, throws an error otherwise.
 */
function validateScrapedInfo(data: any): ScrapedInfo {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Invalid ScrapedInfo: not an object or is null.');
  }

  // Basic checks for top-level properties
  if (typeof data.url !== 'string') {
    throw new Error('Invalid ScrapedInfo: url must be a string.');
  }
  if (typeof data.name !== 'string') {
    throw new Error('Invalid ScrapedInfo: name must be a string.');
  }
  if (!Array.isArray(data.brands) || !data.brands.every((item: any) => typeof item === 'string')) {
    throw new Error('Invalid ScrapedInfo: brands must be an array of strings.');
  }
  if (typeof data.location !== 'string') {
    throw new Error('Invalid ScrapedInfo: location must be a string.');
  }
  if (typeof data.about !== 'string') {
    throw new Error('Invalid ScrapedInfo: about must be a string.');
  }
  if (typeof data.retour !== 'string') {
    throw new Error('Invalid ScrapedInfo: retour must be a string.');
  }
  if (!Array.isArray(data.type) || !data.type.every((item: any) => typeof item === 'string')) {
    throw new Error('Invalid ScrapedInfo: type must be an array of strings.');
  }

  // Validate openingHours structure
  if (typeof data.openingHours !== 'object' || data.openingHours === null) {
    throw new Error('Invalid ScrapedInfo: openingHours must be an object.');
  }

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // IMPORTANT: Ensure all expected days are present as keys in openingHours first.
  // This prevents 'Cannot read properties of undefined' if a day is missing from the AI's output.
  for (const day of daysOfWeek) {
    if (!(day in data.openingHours)) {
      throw new Error(
        `Validation Error: 'openingHours' is missing expected day: "${day}". The AI must provide all days.`,
      );
    }
  }

  // Now iterate and validate content for each day, knowing the key exists
  for (const day of daysOfWeek) {
    const dayData = data.openingHours[day]; // This should now always be defined, if the previous check passes.
    if (typeof dayData !== 'object' || dayData === null) {
      // This check is a safeguard, but the previous 'day in data.openingHours' should prevent this.
      throw new Error(
        `Validation Error: openingHours.${day} must be an object (got ${typeof dayData}).`,
      );
    }
    if (typeof dayData.open !== 'string') {
      throw new Error(`Validation Error: openingHours.${day}.open must be a string.`);
    }
    if (typeof dayData.close !== 'string') {
      throw new Error(`Validation Error: openingHours.${day}.close must be a string.`);
    }
    // Check optional fields
    if (dayData.openAfterNoon !== null && typeof dayData.openAfterNoon !== 'string') {
      throw new Error(
        `Validation Error: openingHours.${day}.openAfterNoon must be a string or null.`,
      );
    }
    if (dayData.closeAfterNoon !== null && typeof dayData.closeAfterNoon !== 'string') {
      throw new Error(
        `Validation Error: openingHours.${day}.closeAfterNoon must be a string or null.`,
      );
    }

    // This is the line that previously caused the error because dayData was undefined.
    // It is now safer because we've confirmed dayData and its 'open'/'close' properties are strings.
    if (dayData.open.trim() === '' || dayData.close.trim() === '') {
      console.warn(
        `Validation Warning: openingHours for ${day} has empty open/close times. Attempting to proceed.`,
      );
    }
  }

  return data as ScrapedInfo;
}

/**
 * --- Core AI Summarization Function ---
 */

/**
 * Summarizes relevant information using the AI model, with retry logic for API calls and robust validation.
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
  const baseDelay = 1500; // 1.5 seconds

  while (attempts < maxAttempts) {
    try {
      console.log(`Attempt ${attempts + 1}: Sending prompt to LLMService...`);
      // Use the LLMService.sendPrompt method
      let aiResponse = await LLMService.sendPrompt(prompt);

      if (!aiResponse) {
        console.error('LLMService returned an empty response.');
        attempts++;
        const delay = baseDelay * Math.pow(2, attempts);

        // eslint-disable-next-line no-undef
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      console.log('Raw AI response from LLMService:', aiResponse);

      try {
        // Pre-process the AI response to remove markdown code block delimiters if present.
        // The error "Unexpected token '`', '```json" indicates the AI is wrapping the JSON
        // in markdown code block syntax despite the prompt's instruction.
        if (aiResponse.startsWith('```json')) {
          aiResponse = aiResponse.substring('```json'.length);
        }
        if (aiResponse.endsWith('```')) {
          aiResponse = aiResponse.substring(0, aiResponse.length - '```'.length);
        }
        // Trim any leading/trailing whitespace that might remain
        aiResponse = aiResponse.trim();

        console.log('Cleaned AI response for JSON parsing:', aiResponse);

        // The LLMService.sendPrompt returns a string, which should be the JSON.
        // We'll attempt to parse it directly.
        const parsed = JSON.parse(aiResponse) as ScrapedInfo;
        validateScrapedInfo(parsed); // Use the validation function
        return parsed;
      } catch (err) {
        console.error('Failed to parse or validate AI response as JSON:', err);
        // This catch block handles JSON parsing errors or validation errors.
        // The LLMService.sendPrompt is expected to handle its own internal API retries.
        attempts++;
        // eslint-disable-next-line no-undef
        await new Promise((resolve) => setTimeout(resolve, baseDelay * Math.pow(2, attempts)));
      }
    } catch (error) {
      // This outer catch block primarily catches errors originating from LLMService.sendPrompt
      // that are not internally handled (e.g., unexpected critical errors from the service itself).
      const err = error as any;
      console.error('Error during LLMService call:', err.message);
      // For general errors, we still apply the backoff and retry logic,
      // assuming they might be transient.
      attempts++;
      // eslint-disable-next-line no-undef
      await new Promise((resolve) => setTimeout(resolve, baseDelay * Math.pow(2, attempts)));
    }
  }

  console.error('Failed to get valid AI response after maximum attempts');
  return null;
}

async function handleOverlays(page: Page) {
  // 1. Handle Cookie Consent (High Priority)
  try {
    // Look for common "accept" button text/selectors
    const acceptButton = page
      .locator('text=/^(Accept|Akkoord|Alles accepteren|Begrijp|Alle cookies accepteren)$/i')
      .first();
    if (await acceptButton.isVisible({ timeout: 5000 })) {
      console.log('Clicking cookie accept button.');
      await acceptButton.click();
      await page.waitForLoadState('domcontentloaded'); // Wait for page to settle after click
      await page.waitForTimeout(500); // Short delay for animations/scripts
    }
  } catch {
    console.log('No cookie consent button found or could not interact with it. Continuing.');
  }

  // 2. Handle Chat Widget Iframe
  try {
    // Option A: Try to click a close button if common patterns exist
    const chatCloseButton = await page.locator('iframe#launcher button[aria-label="Close"]'); // Example selector
    if (await chatCloseButton.isVisible({ timeout: 2000 })) {
      console.log('Clicking chat widget close button.');
      await chatCloseButton.click();
      await page.waitForTimeout(500);
    } else {
      // Option B: Try pressing Escape key if no specific close button is found
      console.log('Attempting to dismiss chat widget with Escape key.');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  } catch {
    console.log('No chat widget found or could not dismiss it. Continuing.');
  }

  // Option C: If you know the iframe ID and it's not essential, you can try to remove it
  try {
    await page.evaluate(() => {
      // eslint-disable-next-line no-undef
      const launcher = document.getElementById('launcher');
      if (launcher) {
        launcher.remove();
        console.log('Removed chat launcher iframe.');
      }
      // eslint-disable-next-line no-undef
      const cookieWrapper = document.getElementById('cookiescript_injected_wrapper');
      if (cookieWrapper) {
        cookieWrapper.remove(); // Also remove cookie dialog if still present
        console.log('Removed cookie wrapper div.');
      }
    });
    await page.waitForTimeout(200); // Give browser time to re-render
  } catch (e) {
    console.error('Error attempting to remove overlays via evaluate:', e);
  }
}

/**
 * --- Main Scraper Function ---
 */

type ScraperResult = Record<string, string[]> | null;

/**
 * Orchestrates the scraping process for a given URL to extract structured keyword contexts.
 * This function handles page navigation, content extraction, keyword context finding.
 * It also includes logic to skip detected product detail pages.
 * @param {string} url - The URL to scrape.
 * @param {Page} page - The Playwright Page object.
 * @returns {Promise<ScraperResult>} The raw keyword contexts, or null if skipped or on error.
 */
export async function scraper(url: string, page: Page): Promise<ScraperResult> {
  console.log(`Scraping URL: ${url}`);

  try {
    await blockUnnecessaryResources(page);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // --- NEW: Product Page Detection ---
    if (await isProductDetailPage(page, url)) {
      console.log(`Skipping product detail page: ${url}`);
      return null; // Return null to indicate it was skipped
    }
    // --- END NEW ---

    await handleOverlays(page); // Handle cookie banners, chat widgets, etc.
    await clickInteractiveButtons(page); // Click "load more" buttons

    const detectedLanguage = await detectLanguage(page);
    const keywordConfig = getKeywords(detectedLanguage); // Get keywords based on detected language

    const pageText = await extractPageText(page);
    const keywordContexts = findKeywordContexts(
      pageText,
      keywordConfig.keywords,
      keywordConfig.wordsBeforeMap,
      keywordConfig.wordsAfterMap,
    );

    return keywordContexts; // Return the raw keyword contexts for the main thread to consolidate
  } catch (error: any) {
    console.error('Error scraping URL:', url, error);
    return null;
  } finally {
    if (page && !page.isClosed()) {
      await page.close();
    }
  }
}

/**
 * Determines if a given page is likely a product detail page.
 * You might want to move this helper function to a dedicated 'utils' file.
 * @param {Page} page - The Playwright Page object.
 * @param {string} url - The URL of the page.
 * @returns {Promise<boolean>} True if it's likely a product page, false otherwise.
 */
async function isProductDetailPage(page: Page, url: string): Promise<boolean> {
  // --- Detection Method 1: URL Patterns ---
  const productUrlPatterns = [
    /\/product\/\S+/,
    /\/products\/\S+/,
    /\/shop\/\S+\/\S+/,
    /\/item\/\S+/,
    /\/[a-z0-9-]+\-p-(\d+)\.html/, // eslint-disable-line
    /\/[a-z0-9-]+\-id-(\d+)\.html/, // eslint-disable-line
    /\/[a-z0-9-]+\/dp\/\w+/,
    /\/[a-zA-Z0-9-]+-\d+-\d+$/,
    /\?.+/,
  ];
  for (const pattern of productUrlPatterns) {
    if (pattern.test(url)) {
      console.log(`  [DETECTED] Product page by URL pattern: "${pattern.source}"`);
      return true;
    }
  }

  // --- Detection Method 2: Schema Markup (Very High Confidence) ---
  try {
    const hasProductSchema = await page.evaluate(() => {
      // eslint-disable-next-line no-undef
      const productSchema = document.querySelector('script[type="application/ld+json"]');
      if (productSchema && productSchema.textContent) {
        try {
          const json = JSON.parse(productSchema.textContent);
          const schemas = Array.isArray(json) ? json : [json];
          return schemas.some(
            (schema) =>
              schema['@type'] === 'Product' ||
              schema['@type'] === 'Offer' || // Offers are typically within products
              (schema['@type'] === 'ListItem' && schema.item && schema.item['@type'] === 'Product'),
          );
        } catch {
          // console.warn('Error parsing JSON-LD schema:', e);
          return false; // Invalid JSON-LD
        }
      }
      return false;
    });
    if (hasProductSchema) {
      console.log(`  [DETECTED] Product page by Schema.org "Product" or "Offer" markup.`);
      return true;
    }
  } catch (e) {
    console.warn(`  [WARNING] Error checking schema markup for ${url}: ${e}`);
  }

  // --- Detection Method 3: Specific HTML Elements (Require Multiple Strong Indicators) ---
  let productIndicators = 0;

  const strongProductElementSelectors = [
    'button:has-text("Add to Cart")',
    'button:has-text("Add to Basket")',
    'button:has-text("In Winkelwagen")', // Dutch for "Add to Cart"
    'span[itemprop="price"]', // Price element with schema.org
    '.product-price', // Common class for price
    'div[itemprop="offers"]', // Schema for offers (even without full JSON-LD)
    'meta[property="og:type"][content="product"]', // Open Graph type for products
    'link[rel="canonical"][href*="/product/"]', // Canonical URL pointing explicitly to product
  ];

  for (const selector of strongProductElementSelectors) {
    try {
      // Check for existence without waiting for visibility to be faster
      const element = page.locator(selector).first();
      if ((await element.count()) > 0) {
        productIndicators++;
        console.log(`  - Found strong product indicator element: "${selector}"`);
      }
    } catch {
      /* ignore if selector doesn't exist */
    }
  }

  // Additional very common product page elements, but less definitive on their own
  const commonProductPageElements = [
    '.product-image-gallery', // Often a dedicated gallery on product pages
    '#product-details', // A common ID for a product details section
    'h1.product-title', // A main heading explicitly for the product title
    'img[alt*="product image"], img[src*="/products/"]', // Image tags strongly suggesting product content
  ];

  for (const selector of commonProductPageElements) {
    try {
      const element = await page.locator(selector).first();
      if ((await element.count()) > 0) {
        productIndicators++; // Increment count for these too
        console.log(`  - Found common product page element: "${selector}"`);
      }
    } catch {
      /* ignore */
    }
  }

  // Require a minimum number of strong indicators to classify as a product page
  // A single generic class like '.product-title' is not enough.
  // E-commerce product pages typically have at least 3-4 distinct indicators.
  const MIN_PRODUCT_INDICATORS = 3; // Adjust this threshold if needed after testing

  if (productIndicators >= MIN_PRODUCT_INDICATORS) {
    console.log(
      `  [DETECTED] Product page by ${productIndicators} HTML element indicators (>= ${MIN_PRODUCT_INDICATORS} required).`,
    );
    return true;
  }

  console.log(`  [NOT DETECTED] Not identified as a product page.`);
  return false; // Not detected as a product page
}
