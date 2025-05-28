import axios from 'axios';
import * as cheerio from 'cheerio';
import excludeKeywords from './linkCrawler/excludedKeywords';

function shouldExcludeUrl(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  return excludeKeywords.some((keyword) => lowerUrl.includes(keyword));
}

async function getLinksFromUrl(url: string): Promise<string[]> {
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
    const links = $('a[href]')
      .map((_, el) => $(el).attr('href'))
      .get()
      .filter(Boolean) as string[];

    return links;
  } catch (err) {
    if (err instanceof Error) {
      console.warn(`Failed to fetch ${url}: ${err.message}`);
    } else {
      console.warn(`Failed to fetch ${url}: ${String(err)}`);
    }
    return [];
  }
}

export async function getAllInternalLinks(baseUrl: string, maxPerSubpage = 50): Promise<string[]> {
  const baseOrigin = new URL(baseUrl).origin;
  const firstLevel = await getLinksFromUrl(baseUrl);

  const firstLevelInternal = firstLevel
    .map((href) => {
      try {
        return new URL(href, baseUrl).href;
      } catch {
        return null;
      }
    })
    .filter((url): url is string => !!url && url.startsWith(baseOrigin) && !shouldExcludeUrl(url));

  const secondLevelLinks: string[] = [];

  for (const subpage of firstLevelInternal) {
    console.log(`[getAllInternalLinks] Visiting subpage: ${subpage}`);
    const subLinks = await getLinksFromUrl(subpage);
    const internalSubLinks = subLinks
      .map((href) => {
        try {
          return new URL(href, subpage).href;
        } catch {
          return null;
        }
      })
      .filter(
        (link): link is string => !!link && link.startsWith(baseOrigin) && !shouldExcludeUrl(link),
      )
      .slice(0, maxPerSubpage);

    secondLevelLinks.push(...internalSubLinks);
  }

  return [...new Set(secondLevelLinks)];
}
