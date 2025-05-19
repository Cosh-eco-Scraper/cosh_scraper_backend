import databaseClient from '../config/dbConnectionConfig';
import { storeQueries } from './queries/store.queries';
import { Store } from '../domain/Store';
import { mapper } from './mapper';

export const StoreRepository = {
  getAllStores: async () => {
    try {
      databaseClient.connect();
      const result = await databaseClient.query(storeQueries.getAllStores());

      const stores: Store[] = result.rows.map(mapper.mapStore);

      return stores;
    } finally {
      databaseClient.end();
    }
  }
};
