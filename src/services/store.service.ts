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


    const guidelines = 'https://www.europarl.europa.eu/topics/en/article/20240111STO16722/stopping-greenwashing-how-the-eu-regulates-green-claims'

    
    const prompt = `
        Write a fluent, engaging brand description of approximately 225 words for a store page. Use our usual tone of voice: professional yet conversational, clear, positive, and descriptive.

        Strictly follow the structure below and DO NOT make any green/environmental claims (use ${guidelines}), mention discounts/sales, or refer to online shopping.

        Structure:
        - write this description as one paragraph without any line breaks or bullet points.
        - A few descriptive words + the city where the store is located ${scrapedInfo.location}.
        - A brief summary of what the store does and stands for. This should be (approx. 110 characters).  
        - In a sentence describe the store concept.
        - Then describe the main products sold by the store be very specific, e.g., “elegant women’s fashion” or “refined coats and quality dresses”) 
        - After that Describe something distinctive about the store without explicitly stating it's unique  
        - Mention one thing that makes the store more conscious (without using words like “sustainable” or “eco-friendly”). use this link as a reference for the guidelines.
        - (optional)Only if mentioned on the website, add info about resell systems, takeback, repairs, rentals, etc. Leave this out if not applicable  
        - For multi-brand or flagship stores only, add: “Discover the brands available at [store name] below.” (Do not include this for second-hand stores or workshop spaces)

        Use the following URL as your sole source of information. Extract only factual, verifiable content from it. Do NOT copy or include any green/environmental marketing claims from the site.  
        ${URL}
    `;



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
