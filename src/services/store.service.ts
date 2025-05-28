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


    const prompt = `Write a flowing text in our usual writing style for this store ${URL} and ${scrapedInfo.about} based on the following criteria:
      * Approximately 225 words long
      * Title: name of the store
      * Subtitle: explanation of a few words + city where the store is located
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
      * Make sure that apostrophe is noted as ('')
      * Do not mention discounts, online shopping, or sales
      * Do NOT make green claims`;


    const largerDescription = await LLMService.sendPrompt(prompt);
    console.log('prompt:', prompt)
    const betterDescription =  escapeApostrophes(largerDescription ?? '');

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

    const store = await StoreRepository.createStore(
      name,
      locationObj.id,
      betterDescription
    );

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
