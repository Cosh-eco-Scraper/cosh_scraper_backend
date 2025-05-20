import { chromium, Page } from 'playwright';

type ScrapedInfo = {
    url: string;
    brands: string[];
    openingHours: string[];
    location: string[];
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


async function scrapeBrands(page: Page): Promise<string[]> {
    const brandsFromMerk = await page.$$eval('a[href*="/merk/"]', links =>
        links.map(link => {
            for (const node of link.childNodes) {
                if (node.nodeType === Node.TEXT_NODE) {
                    return node.textContent?.trim() || '';
                }
            }
            return '';
        })
            .filter(text => text.length > 0 && !['Ontdek alle merken', 'Alle merken', 'Merken', 'Alle kleding', 'Alle accessoires'].includes(text))
    );

    if (brandsFromMerk.length > 0) {
        return Array.from(new Set(brandsFromMerk));
    }

    const brandsFromDropdown = await page.$$eval('li.has-dropdown', dropdowns => {
        for (const dropdown of dropdowns) {
            const anchor = dropdown.querySelector('a');
            if (anchor?.textContent?.trim().toLowerCase() === 'brands') {
                const brandLinks = dropdown.querySelectorAll('ul.dropdown > li > a');
                return Array.from(brandLinks).map(el => el.textContent?.trim() || '').filter(Boolean);
            }
        }
        return [];
    });

    if (brandsFromDropdown.length > 0) {
        return brandsFromDropdown;
    }

    return await scrapeByKeywords(page, ['brand', 'merk', 'merken']);
}

async function scrapeByKeywords(page: Page, keywords: string[]): Promise<string[]> {
    for (const keyword of keywords) {
        const selector = `[id*="${keyword}"], [class*="${keyword}"]`;
        const texts = await page.$$eval(selector, els =>
            els.map(el => el.textContent?.trim() || '').filter(Boolean)
        );
        if (texts.length > 0) return texts;
    }
    return [];
}

async function scrapeAboutParagraph(page: Page): Promise<string> {
    const aboutText = await page.$$eval('section, div', (sections) => {
        for (const sec of sections) {
            if (/about|intro/i.test(sec.className) || /about|intro/i.test(sec.id || '')) {
                const p = sec.querySelector('p');
                if (p) return p.textContent?.trim() || '';
            }
        }
        return '';
    });
    if (aboutText) return aboutText;

    const paragraphs = await page.$$eval('p', ps =>
        ps.map(p => p.textContent?.trim() || '').filter(Boolean)
    );
    return paragraphs.find(p => /about/i.test(p)) || '';
}

async function scrapeOpeningHours(page: Page): Promise<string[]> {
    let results = await page.$$eval('footer p', ps =>
        ps.map(p => p.textContent?.trim() || '').filter(text => /hour|uur|open/i.test(text))
    );
    if (results.length) return results;

    results = await scrapeByKeywords(page, ['hour', 'open', 'time', 'uur']);
    return results;
}

async function scrapeAddress(page: Page): Promise<string[]> {
    const links = await getAllInternalLinks(page);
    console.log(`Found ${links.length} internal links`);

    for (const link of links) {
        console.log(`Visiting: ${link}`);
        const subPage = await page.context().newPage();

        try {
            await subPage.goto(link, { waitUntil: 'domcontentloaded', timeout: 10000 });
            await subPage.waitForTimeout(500);

            //Case 1: <p> with "Adres: ..."
            const inlineAddress = await subPage.$$eval('p', ps =>
                ps
                    .map(p => p.textContent?.trim() || '')
                    .filter(text => /Adres:/i.test(text))
                    .map(text => {
                        const match = text.match(/Adres:\s*(.+)/i);
                        return match ? match[1].trim() : '';
                    })
                    .filter(Boolean)
            );
            if (inlineAddress.length) {
                console.log(`Inline <p> address found: ${inlineAddress[0]}`);
                await subPage.close();
                return inlineAddress;
            }

            //Case 2: Heading followed by paragraph
            const addressFromHeading = await subPage.$$eval('h1, h2, h3, h4, h5, h6', headings => {
                for (let i = 0; i < headings.length; i++) {
                    const heading = headings[i];
                    if (/Adres:/i.test(heading.textContent || '')) {
                        let next = heading.nextElementSibling;
                        while (next) {
                            if (next.tagName.toLowerCase() === 'p') {
                                return [next.textContent?.trim() || ''];
                            }
                            next = next.nextElementSibling;
                        }
                    }
                }
                return [];
            });
            if (addressFromHeading.length) {
                console.log(`Heading + <p> address found: ${addressFromHeading[0]}`);
                await subPage.close();
                return addressFromHeading;
            }

            //Case 3: Two spans — label then address
            const addressFromSpan = await subPage.$$eval('span', spans => {
                for (let i = 0; i < spans.length; i++) {
                    const text = spans[i].textContent?.trim() || '';
                    if (/adres/i.test(text)) {
                        const next = spans[i + 1];
                        if (next) {
                            const nextText = next.textContent?.trim();
                            if (nextText && /\d{4}/.test(nextText)) {
                                return [nextText];
                            }
                        }
                    }
                }
                return [];
            });
            if (addressFromSpan.length) {
                console.log(`Label <span> + address <span> found: ${addressFromSpan[0]}`);
                await subPage.close();
                return addressFromSpan;
            }

            await subPage.close();
        } catch (err) {
            if (err instanceof Error) {
                console.error(`Error visiting ${link}:`, err.message);
            } else {
                console.error(`Error visiting ${link}:`, err);
            }
            await subPage.close();
            continue;
        }
    }

    console.log('No address found in any subpages');
    return [];
}

export async function scraper(url: string): Promise<ScrapedInfo | null> {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded' });

        const brands = await scrapeBrands(page);
        let openingHours = await scrapeOpeningHours(page);
        const location = await scrapeAddress(page);

        let about = await scrapeAboutParagraph(page);
        const aboutLinks = await page.$$eval('a[href]', as =>
            as.map(a => a.getAttribute('href') || '').filter(href => /about|over-ons|about-us/i.test(href))
        );

        if (aboutLinks.length > 0) {
            const aboutUrl = new URL(aboutLinks[0], url).href;
            if (aboutUrl !== url) {
                try {
                    await page.goto(aboutUrl, { waitUntil: 'domcontentloaded' });
                    about = await scrapeAboutParagraph(page) || about;
                    await page.goto(url, { waitUntil: 'domcontentloaded' });
                } catch {
                    console.error(`Error visiting about page: ${aboutUrl}`);
                }
            }
        }

        return {
            url,
            brands,
            openingHours,
            location,
            about,
        };
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
    const url = 'https://harvestclub.be/';
    const scrapedData = await scraper(url);
    console.log(scrapedData);
}
)();