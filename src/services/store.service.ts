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

    const prompt = `Write one continuous paragraph (no line breaks) in our usual writing style for the store at this URL: ${URL}. 
    The description should be about 225 words long. Begin with a few key words relevant to the store and mention the city where the store is located. 
    Add a short summary explaining what the store does and what it stands for as a concept.
    Mention the specific types of products they sell using clear and concrete terms (for example: “elegant women’s fashion”, “quality dresses and refined jackets” — not just “fashion”).
    Include something special about the store that sets it apart, without using phrases like “unique” or “different from other stores”.
    Explain how the store tries to reduce its environmental impact, but do not use any general green claims that are metoined in the guidelines in this link ${guidelines}. 
    If the store uses systems like resell, takeback, repair, or rental services and they are mentioned on the site, describe them. If not, skip that. If the store is a multi-brand or flagship store, end with: “Find the brands they sell below.” 
    Do not mention this if it’s a second-hand store or a workshop.
    Write in third person. Don’t use semicolons, and don’t mention discounts, online shopping, or sales. 
    Do not end the paragraph with a newline character.
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
