import databaseClient from '../config/dbConnectionConfig';
import { storeQueries } from './queries/store.queries';
import { Store } from '../domain/Store';
import { storeMapper } from './mapper';
import NotFoundError from '../domain/errors/NotFoundError';

export const StoreRepository = {
  getAllStores: async () => {
    var stores: Store[] = [];

    try {
      databaseClient.connect();
      const result = await databaseClient.query(storeQueries.getAllStores());

      stores = result.rows.map(storeMapper.mapStore);
    } finally {
      databaseClient.end();
    }

    return stores;
  },
  getStore: async (id: number) => {
    try {
      databaseClient.connect();
      const result = await databaseClient.query(storeQueries.getStoreById(id));

      if (!result.rows.length) {
        throw new NotFoundError('Store not found');
      }

      return result.rows.map(storeMapper.mapStore)[0] as Store;
    } finally {
      databaseClient.end();
    }
  },

  updateStore: async (storeId: number, name: string, location_id: number, description?: string) => {
    try {
      databaseClient.connect();
      const result = await databaseClient.query(
        storeQueries.updateStore(storeId, name, location_id, description)
      );

      if (!result.rowCount) {
        throw new NotFoundError('Store not found');
      }

      return result.rows.map(storeMapper.mapStore)[0] as Store;
    } finally {
      databaseClient.end();
    }
  },
};
