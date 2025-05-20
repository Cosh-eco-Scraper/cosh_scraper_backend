import databasePool from '../config/dbConnectionConfig';
import { storeQueries } from './queries/store.queries';
import { Store } from '../domain/Store';
import { mapper } from './mapper';
import NotFoundError from '../domain/errors/NotFoundError';
import { DatabaseOpeningHours } from '../domain/OpeningHours';
import { DatabaseBrand } from '../domain/Brand';

export const StoreRepository = {
  getAllStores: async () => {
    let stores: Store[] = [];

    const result = await databasePool.query(storeQueries.getAllStores());
    stores = result.rows.map(mapper.mapStore);

    return stores;
  },
  getStore: async (id: number) => {
    let store: Store;
    const result = await databasePool.query(storeQueries.getStoreById(id));

    try {
      databasePool.connect();
      const result = await databasePool.query(storeQueries.getStoreById(id));

      if (!result.rows.length) {
        throw new NotFoundError('Store not found');
      }

      return result.rows.map(mapper.mapStore)[0] as Store;
    } finally {
      databasePool.end();
    }
  },

  updateStore: async (storeId: number, name: string, location_id: number, description?: string): Promise<void> => {
    try {
      databasePool.connect();
      const result = await databasePool.query(
        storeQueries.updateStore(storeId, name, location_id, description)
      );

      if (!result.rowCount) {
        throw new NotFoundError('Store not found');
      }

    } finally {
      databasePool.end();
    }
  },
  getStoreWithOpeningsHours: async (id: number) => {
    let hours: DatabaseOpeningHours[] = [];

    const result = await databasePool.query(storeQueries.getStoreWithOpeningsHoursById(id));

    if (!result.rows.length) {
      throw new NotFoundError('Store not found');
    }

    hours = result.rows.map(mapper.mapHour);

    return hours;
  },
  getBrandsByStoreId: async (id: number) => {
    let brands: DatabaseBrand[] = [];

    const result = await databasePool.query(storeQueries.getBrandsByStoreId(id));

    if (!result.rows.length) {
      throw new NotFoundError('Store not found');
    }

    brands = result.rows.map(mapper.mapBrand);

    return brands;
  }

};
