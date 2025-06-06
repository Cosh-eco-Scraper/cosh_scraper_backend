import axios from 'axios';
import robotsParser from 'robots-parser';
import { URL } from 'url';
import dotenv from 'dotenv'; // Explicitly import URL if not already global
dotenv.config();

export interface Robot {
  isAllowed(url: string, ua?: string): boolean | undefined;

  isDisallowed(url: string, ua?: string): boolean | undefined;

  getMatchingLineNumber(url: string, ua?: string): number;

  getCrawlDelay(ua?: string): number | undefined;

  getSitemaps(): string[];

  getPreferredHost(): string | null;
}

export default async function getRobotParser(websiteUrl: string): Promise<Robot> {
  let parsedWebsiteUrl: URL;
  try {
    parsedWebsiteUrl = new URL(websiteUrl); // Ensure the input websiteUrl is a valid URL
  } catch (error) {
    console.error(
      `Invalid website URL provided: ${websiteUrl}. Falling back to default robots parser.`,
      error,
    );
    // Return a default parser that allows everything if the URL is invalid
    return robotsParser('http://localhost/robots.txt', '');
  }

  // Construct the full robots.txt URL using the parsed base URL
  // The second argument to URL constructor needs to be a full URL, not just a host
  const robotsTxtUrl = new URL('/robots.txt', parsedWebsiteUrl.origin).href;

  console.log(`Attempting to fetch robots.txt from: ${robotsTxtUrl}`);

  const context = await getContext(robotsTxtUrl);
  return robotsParser(robotsTxtUrl, context);
}

async function getContext(url: string): Promise<string> {
  try {
    const response = await axios.get(url, {
      timeout: 10000, // Add a timeout for the request (10 seconds)
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; MyAwesomeScraper/1.0; +https://myawesomescraper.com)', // Be a good netizen
        Accept: 'text/plain, text/html', // Explicitly accept plain text for robots.txt
      },
    });

    if (response.status === 200) {
      return response.data;
    } else {
      console.warn(
        `robots.txt not found for ${url} (status: ${response.status}). Treating as fully allowed.`,
      );
      return ''; // Empty context means no rules, effectively fully allowed
    }
  } catch (error: any) {
    // Handle network errors (DNS, connection refused, timeouts)
    if (axios.isAxiosError(error)) {
      console.warn(
        `Failed to fetch robots.txt from ${url}: ${error.message}. Treating as fully allowed.`,
      );
    } else {
      console.error(`An unexpected error occurred while fetching robots.txt from ${url}:`, error);
    }
    return ''; // On error, treat as fully allowed
  }
}
