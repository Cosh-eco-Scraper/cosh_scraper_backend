import { StoreRepository } from '../repositories/store.repository';
import { scraper } from '../scraper/scraper';
import BrandService from './brand.service';
import OpeningHoursService from './openingshours.service';
import LocationService from './location.service';
import storeBrandsService from './storeBrands.service';
import { LLMService } from './llm.service';

export const StoreService = {
  getAllStores: async () => {
    const stores = await StoreRepository.getAllStores();

    return stores;
  },
  getStore: async (id: number) => {
    const store = await StoreRepository.getStore(id);

    return store;
  },
  updateStore: async (storeId: number, name: string, description?: string): Promise<number> => {
    const result = await StoreRepository.updateStore(storeId, name, description);
    return result;
  },
  getOpeningsHoursByStoreId: async (id: number) => {
    let hours = await StoreRepository.getStoreWithOpeningsHours(id);
    hours = hours.sort((a, b) => a.day.orderValue - b.day.orderValue);

    return hours;
  },
  getBrandsByStoreId: async (id: number) => {
    let brands = await StoreRepository.getBrandsByStoreId(id);
    return brands;
  },

  createCompleteStore: async (name: string, URL: string, location: string) => {
    const scrapedInfo = await scraper(URL, location);

    if (!scrapedInfo) {
      throw new Error('Failed to scrape store information');
    }

    function escapeApostrophes(text: string): string {
      return text.replace(/'/g, "''");
    }

    function removeTrailingNewline(text: string): string {
      return text.replace(/\n+$/, '');
    }

    const prompt = `Write a one continuous text without paragraphs in our usual writing style for this store ${URL} and based on the following criteria:
        * Do NOT use vague or unsubstantiated environmental terms. Avoid words and phrases like 'sustainable', 'eco-friendly', 'environmentally friendly', 'green', 'natural' (if implying environmental benefit), 'biodegradable', 'compostable', 'carbon-neutral', 'ethical', 'planet-friendly', etc., unless specific, verifiable, and quantifiable evidence is explicitly present in the source URL.
        * Focus on factual, product-specific attributes instead of broad environmental benefits. For instance, describe products as 'durable', 'long-lasting', 'made from carefully selected materials', 'designed for longevity', 'reusable', or 'repairable', if these facts are supported by the provided sources. Do not imply broader environmental superiority if the information is not explicitly stated.
        * Avoid implying environmental benefits where none are explicitly stated or verified. The description must remain factual and not make any implicit or explicit environmental claims about the store or its products beyond what can be directly and verifiably inferred from the given sources.
        * Approximately 225 words long
        * explanation of a few words + city where the store is located
        * Description: summarize in 110 characters what the store does and what it stands for.
        * The concept of the store
        * The main products they sell. Make this as concrete as possible (e.g., Not "fashion" but "elegant women's fashion", "quality dresses and refined jackets"), ...
        * What makes the store unique compared to other stores without specifically mentioning that this makes the store unique. Just write about something unique about the store.
        * What makes the store more sustainable
        * Any additional sustainability factors if these are mentioned on the website. If not, omit this sentence.
            * Resell system, takeback system, repair, do they rent, ...
        * 1 sentence about "find the brands they sell below" (for multi-brands and possibly flagships, NOT for second-hand, workshops, ...)
        * Use third-person
        * Do not use semicolons
        * The entire text must be presented as one continuous block of text, without any paragraph breaks.
        * Make sure that apostrophe is noted as ('')
        * Do not mention discounts, online shopping, or sales
        * The final generated text must NOT end with a newline character.`;

    const largerDescription = await LLMService.sendPrompt(prompt);
    console.log('prompt:', prompt);
    const apostropheRemoved = escapeApostrophes(largerDescription ?? '');
    const betterDescription = removeTrailingNewline(apostropheRemoved);

    const [street, number, postalCode, city, country] = (scrapedInfo.location || '')
      .split(',')
      .map((s) => s.trim());
    const locationObj = await LocationService.createLocation(
      street,
      number,
      postalCode,
      city,
      country,
    );

    const store = await StoreRepository.createStore(name, locationObj.id, betterDescription);

    if (scrapedInfo.brands && scrapedInfo.brands.length > 0) {
      for (const brandName of scrapedInfo.brands) {
        await BrandService.createBrand(brandName, null);
      }
    }

    if (scrapedInfo.openingHours) {
      for (const [day, hours] of Object.entries(scrapedInfo.openingHours)) {
        if (hours) {
          await OpeningHoursService.createOpeningHours(day, hours.open, hours.close, store.id);
        }
      }
    }

    if (scrapedInfo.brands && scrapedInfo.brands.length > 0) {
      for (const brandName of scrapedInfo.brands) {
        // Create or get the brand
        const brand = await BrandService.createBrand(brandName, null);
        // Associate the brand with the store
        await storeBrandsService.addBrandToStore(store.id, brand.id);
      }
    }

    // Retour field still has to be handled

    return store;
  },
};
