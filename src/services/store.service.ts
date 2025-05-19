import { Store } from '../domain/Store';
import { StoreRepository } from '../repositories/store.repository';
import NotFoundError from '../domain/errors/NotFoundError';

export const StoreService = {
  getAllStores: async () => {
    const stores = await StoreRepository.getAllStores();

    return stores;
  },
  getStore: async (id: number) => {
    const store = await StoreRepository.getStore(id);


    return store;
  },
  updateStore: async (storeId: number, name: string, location_id: number, description?: string) => {
    const store = await StoreRepository.updateStore(storeId, name, location_id, description);

    if (!store) {
      throw new NotFoundError('Store not found');
    }

    return store;
  },
};
