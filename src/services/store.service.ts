import { StoreRepository } from '../repositories/store.repository';
import { scraper } from '../../scraper/scraper';
import BrandService from './brand.service';
import OpeningHoursService from './openingshours.service';
import LocationService from './location.service';

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
      const [, street, number, postalCode, city, country] = match;
      locationObj = await LocationService.createLocation(
        street.trim(),
        number.trim(),
        postalCode.trim(),
        city.trim(),
        (country || 'Belgium').trim()
      );
      console.log('LocationService.createLocation result:', locationObj);
    } else {
      // fallback: just use the full string as city
      locationObj = await LocationService.createLocation(
        '', '', '', scrapedInfo.location, ''
      );
      console.log('LocationService.createLocation fallback result:', locationObj);
    }

    const store = await StoreRepository.createStore(
      name,
      locationObj.id,
      scrapedInfo.about
    );

    if (scrapedInfo.brands && scrapedInfo.brands.length > 0) {
      for (const brandName of scrapedInfo.brands) {
        await BrandService.createBrand(brandName, null);
      }
    }

    if (scrapedInfo.openingHours) {
      for (const [day, hours] of Object.entries(scrapedInfo.openingHours)) {
        if (hours) {
          await OpeningHoursService.createOpeningHours(
            day,
            hours.open,
            hours.close,
            store.id
          );
        }
      }
    }

    // Retour field still has to be handled

    return store;
  },
};