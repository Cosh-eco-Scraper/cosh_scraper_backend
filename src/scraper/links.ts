import axios from 'axios';
import * as cheerio from 'cheerio';

const excludeKeywords = [
  'heren',
  'dames',
  'ladies',
  'mannen',
  'man',
  'vrouw',
  'men',
  'kids',
  'kinderen',
  'kind',
  'baby',
  'babies',
  'meisjes',
  'jongens',
  'jong',
  'jongen',
  'jongedame',
  'jongeman',
  'jongvolwassenen',
  'volwassenen',
  'volwassene',
  'kinderkleding',
  'babykleding',
  "baby's",
  "baby's kleding",
  "baby's kleding",
  "baby's kleren",
  "baby's kledij",
  "baby's mode",
  "baby's outfits",
  "baby's kledingstukken",
  "baby's kledingcollectie",
  "baby's kledinglijn",
  "baby's kledingmerk",
  "baby's kledingwinkel",
  "baby's kledingzaak",
  "baby's kledingboetiek",
  "baby's kledingaccessoires",
  'bad',
  'kamperen',
  'kamperen',
  'kampeer',
  'kampeerartikelen',
  'kampeeraccessoires',
  'kampeerspullen',
  'kampeeruitrusting',
  'kampeerbenodigdheden',
  'kampeermateriaal',
  'kampeerkleding',
  'kampeermeubels',
  'kampeertenten',
  'kampeerstoelen',
  'kampeertafels',
  'kampeerlampen',
  'kampeerkookgerei',
  'kampeerkooktoestellen',
  'kampeerkookaccessoires',
  'producten',
  'producten',
  'product',
  'artikelen',
  'artikel',
  'spullen',
  'spul',
  'kleding',
  'kleren',
  'mode',
  'outfits',
  'kledingstukken',
  'kledingcollectie',
  'kledinglijn',
  'kledingmerk',
  'kledingwinkel',
  'kledingzaak',
  'kledingboetiek',
  'kledingaccessoires',
  'jassen',
  'jassen',
  'jas',
  'jacks',
  'jack',
  'vesten',
  'vest',
  'hoodies',
  'hoodie',
  'sweaters',
  'sweater',
  'truien',
  'trui',
  't-shirts',
  't-shirt',
  'tops',
  'top',
  'blouses',
  'blouse',
  'shirts',
  'shirt',
  'jeans',
  'jeans',
  'broeken',
  'broek',
  'rokken',
  'rok',
  'jurken',
  'jurk',
  'shorts',
  'short',
  'schoenen',
  'schoen',
  'sneakers',
  'sneaker',
  'sandalen',
  'sandalen',
  'laarzen',
  'laars',
  'slippers',
  'slipper',
  'regenkleding',
  'regenjas',
  'regenjassen',
  'regenjacks',
  'regenvesten',
  'regenhoodies',
  'regensweaters',
  'regentruien',
  'regent-shirts',
  'regentops',
  'regenblouses',
  'regenshirts',
  'regenjeans',
  'regenbroek',
  'regenbroeken',
  'regenrokken',
  'regenjurken',
  'regenshorts',
  'regenschoenen',
  'regensneakers',
  'regensandalen',
  'regenlaarzen',
  'regenslippers',
  'accessoires',
  'accessoire',
  'sieraden',
  'sieraad',
  'tassen',
  'tas',
  'portemonnees',
  'portemonnee',
  'riemen',
  'riem',
  'hoeden',
  'hoed',
  'sjaals',
  'sjaal',
  'handschoenen',
  'handschoen',
  'mutsen',
  'muts',
  'sokken',
  'socken',
  '/p/',
  '/c/',
  'account',
  'account',
  'login',
  'inloggen',
  'registreren',
  'aanmelden',
  'aanmelden',
  'registreer',
  'registreer',
  'wachtwoord',
  'wachtwoord vergeten',
  'wachtwoord resetten',
  'wachtwoord herstellen',
  'cart',
  'winkelwagen',
  'winkelmandje',
  'afrekenen',
  'checkout',
  'bestellen',
  'bestel',
  'bestelling',
  'order',
  'orders',
  'orderstatus',
  'track-and-trace',
  'volg-je-bestelling',
  'klantenservice',
  'contact',
  'help',
  'faq',
  'veelgestelde vragen',
];

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
