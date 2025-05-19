import { Store } from '../domain/Store';
import { StoreRepository } from '../repositories/store.repository';

export const StoreService = {
  getAllStores: async () => {
    const stores = await StoreRepository.getAllStores();

    return stores;
  }
};
