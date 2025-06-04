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

    const guidelines =
      'https://www.europarl.europa.eu/topics/en/article/20240111STO16722/stopping-greenwashing-how-the-eu-regulates-green-claims';

    
  const prompt = `You are a marketing copywriter. Your task is to write a product description for a store based on information from a provided URL, adhering to specific length and style guidelines. You must also be aware of and avoid greenwashing, following European and Belgian guidelines.

      **Input:**

      *   **Store URL:** ${URL}
      *   **Store Location:** ${scrapedInfo.location}
      *   **Greenwashing Guidelines URL:** ${guidelines}

      **Output Requirements:**

      *   **Word Count:** Approximately 225 words.
      *   **Paragraph Structure:** Single paragraph (no line breaks).
      *   **Writing Style:** Third person.
      *   **Opening:** Begin with a few relevant keywords related to the store and mention the city where the store is located.
      *   **Summary:** After the opening, include a short summary (approximately 110 characters) that captures what the store does and where it is located.
      *   **Concept Sentence:** Add one sentence about the concept of the store: what it focuses on or how it presents its products.
      *   **Product Categories Sentence:** Include one sentence that clearly describes the main product categories using concrete terms.
      *   **Unique Sentence:** Include one sentence that makes this store unique without specifying *what* makes it unique.
      *   **Greenwashing Avoidance:** Ensure the description avoids any misleading or unsubstantiated environmental claims, adhering to the guidelines provided in the Greenwashing Guidelines URL.

      **Process:**

      1.  Browse the provided URLs to understand the store's offerings and the greenwashing guidelines.
      2.  Write the description, adhering to all specified requirements.
      3.  Ensure the description is accurate, engaging, and avoids any potential greenwashing.
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
