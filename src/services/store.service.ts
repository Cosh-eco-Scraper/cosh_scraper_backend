import { StoreRepository } from '../repositories/store.repository';
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

  createCompleteStore: async (name: string, URL: string) => {
    //to do: scraper takes the URL and returns the store name, description, brands, opening hours and location
    // const { name, description, brands, opening_hours } = await scraper.scrapeStore(URL);
    // await LLMService.sendPrompt(`Write a store description for ${name} located at ${URL}`); will write a description base on the sites scraped data
    // const location = await locationService.createLocation(location);
    // const store = await StoreRepository.createStore(name, location.id, description);
    // await StoreRepository.createStoreBrands(store.id, brands);
    // await StoreRepository.createStoreOpeningHours(store.id, opening_hours);
    // return store;
    console.log('Store name:', name);
    console.log('Store URL:', URL);
  },
};
