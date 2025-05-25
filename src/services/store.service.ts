import { StoreRepository } from '../repositories/store.repository';
import { scraper } from '../scraper/scraper';
import BrandService from './brand.service';
import OpeningHoursService from './openingshours.service';
import LocationService from './location.service';
import storeBrandsService from './storeBrands.service';

// import { LLMService } from './llm.service';

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

    const locationRegex = /^(.*?)(\d+)\s+(\d{4,5})\s+([A-Za-z\s]+)\s*\(?([A-Za-z]*)\)?$/;
    const match = scrapedInfo.location.match(locationRegex);
    let locationObj;
    if (match) {
      let [, street, number, postalCode, city, country] = match;
      street = street.trim();
      number = number.trim();
      postalCode = postalCode.trim();
      city = city.trim();
      country = (country || '').trim();

      // Fallback: if country is empty, try to extract from city
      if (!country) {
        const cityParts = city.split(' ');
        if (cityParts.length > 1) {
          country = cityParts.pop()!;
          city = cityParts.join(' ');
        }
      }
      if (!country) {
        country = 'Belgium';
      }

      locationObj = await LocationService.createLocation(
        street,
        number,
        postalCode,
        city,
        country,
      );
    } else {
      // fallback: just use the full string as city
      locationObj = await LocationService.createLocation('', '', '', scrapedInfo.location, '');
    }

    const store = await StoreRepository.createStore(name, locationObj.id, scrapedInfo.about);

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
