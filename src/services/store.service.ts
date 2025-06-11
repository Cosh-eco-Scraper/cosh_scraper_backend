import { StoreRepository } from '../repositories/store.repository';
import { run } from '../scraper/app';
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
  updateStore: async (
    storeId: number,
    name: string,
    description: string,
    retour: string,
  ): Promise<number> => {
    const result = await StoreRepository.updateStore(storeId, name, description, retour);
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

  getStoreTypesByStoreId: async (id: number) => {
    const storeTypes = await StoreRepository.getStoreTypesByStoreId(id);
    return storeTypes;
  },

  createCompleteStore: async (name: string, URL: string, location: string) => {
    // eslint-disable-next-line no-undef
    const startTime = performance.now();
    const scrapedInfo = await run(URL, location);
    // eslint-disable-next-line no-undef
    const endTime = performance.now();
    const executionTime = endTime - startTime;
    const minutes = Math.floor(executionTime / 60000);
    const seconds = Math.floor((executionTime % 60000) / 1000);
    const milliseconds = Math.floor(executionTime % 1000);
    console.log(`Execution time: ${minutes}min ${seconds}s ${milliseconds}ms`);

    if (!scrapedInfo) {
      throw new Error('Failed to scrape store information');
    }

    function removeTrailingNewline(text: string): string {
      return text.replace(/\n+$/, '');
    }

    const guidelines =
      'https://www.europarl.europa.eu/topics/en/article/20240111STO16722/stopping-greenwashing-how-the-eu-regulates-green-claims';

    const prompt = `
    **personality: you are a professional store content describer, that is against greenwashing**
    
    **Action: you will write a description of the store in a paragraph of text. The description should be about 225 words long.**
    
    Important:
    - The description should be about the store, not the products it sells.
    - This is the store Url: "${URL}"
    - The store is located in this location: "${location}"
    - The Store has to comply with the EU Green Washing Guidelines: ${guidelines}
    
    Notes:
    - The description is written in third person.
    - The description should be one continuous paragraph.
    - The city is mentioned in the beginning of the description.
    - One sentence should be about the store's concept.
    - One sentence about what makes the store unique compared to other stores, without explicitly stating that this makes the store unique. Just write about something unique about the store.
    - One sentence about “find the brands they sell below” (for multibrands and possibly flagships, NOT for second-hand, workshops, ...).
    - The description should not mention discounts, online shopping, or sales.
    `;

    const largerDescription = await LLMService.descriptionGenerator(prompt);
    console.log('prompt:', prompt);
    const betterDescription = removeTrailingNewline(largerDescription || '');

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
      betterDescription,
      scrapedInfo.retour,
    );

    if (scrapedInfo.openingHours) {
      for (const [day, hours] of Object.entries(scrapedInfo.openingHours)) {
        if (hours) {
          await OpeningHoursService.createOpeningHours(day, hours.open, hours.close, store.id);
        }
      }
    }

    if (scrapedInfo.brands && scrapedInfo.brands.length > 0) {
      for (const brandName of scrapedInfo.brands) {
        // Try to find an existing brand
        let brand = await BrandService.getBrandByName(brandName);

        if (!brand) {
          // If it doesn't exist, create it
          brand = await BrandService.createBrand(brandName, null);
        }

        // Now associate (whether new or existing)
        await storeBrandsService.addBrandToStore(store.id, brand.id);
      }
    }

    return store;
  },
};
