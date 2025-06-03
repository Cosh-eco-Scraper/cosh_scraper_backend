import { StoreRepository } from '../repositories/store.repository';
import { run } from '../scraper/app';
import BrandService from './brand.service';
import OpeningHoursService from './openingshours.service';
import LocationService from './location.service';
import storeBrandsService from './storeBrands.service';
import { LLMService } from './llm.service';
import getRobotParser from '../scraper/robot/robot';

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
    retour: string,
    description?: string,
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

    const prompt = `Write a detailed store description between 300 and 500 words. 
    Base the description strictly on the following two sources of information:
      1. Store URL: ${URL}
      2. About Info: "${scrapedInfo.about}
      
      make sure that (') is noted as ''.`;

    const largerDescription = await LLMService.sendPrompt(prompt);
    console.log('Larger description:', largerDescription);

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
      largerDescription ? largerDescription : scrapedInfo.about,
      scrapedInfo.retour,
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

    return store;
  },
};
