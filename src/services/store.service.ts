import { Store } from '../domain/Store';
import { StoreRepository } from '../repositories/store.repository';
import NotFoundError from '../domain/errors/NotFoundError';
import OpeningHoursService from './openingshours.service';
import LocationService from './location.service';
import BrandService from './brand.service';
import { UpdateStoreDto } from '../domain/UpdateStore';

export const StoreService = {
  getAllStores: async () => {
    const stores = await StoreRepository.getAllStores();

    return stores;
  },
  getStore: async (id: number) => {
    const store = await StoreRepository.getStore(id);

    return store;
  },
  updateStore: async (data: UpdateStoreDto) => {
    await StoreRepository.updateStore(data.storeId, data.name, data.locationId, data.description);
    await OpeningHoursService.updateOpeningHours(data.openingHoursId, data.day, data.startTime, data.endTime, data.storeId);
    await LocationService.updateLocation(data.locationId, data.street, data.number, data.postalCode, data.city, data.country);
    await BrandService.updateBrand(data.brandId, data.name, data.label);
  },
  getOpeningsHoursByStoreId: async (id: number) => {
    let hours = await StoreRepository.getStoreWithOpeningsHours(id);
    hours = hours.sort((a, b) => a.day.orderValue - b.day.orderValue);

    return hours;
  },
  getBrandsByStoreId: async (id: number) => {
    let brands = await StoreRepository.getBrandsByStoreId(id);
    return brands;
  }
};
