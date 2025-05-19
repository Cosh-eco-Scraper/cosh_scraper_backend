import databaseClient from '../config/dbConnectionConfig';
import { storeQueries } from './queries/store.queries';
import { Store } from '../domain/Store';
import { mapper } from './mapper';
import NotFoundError from '../domain/errors/NotFoundError';
import { DatabaseOpeningHours } from '../domain/OpeningHours';
import { DatabaseBrand } from '../domain/Brand';

export const StoreRepository = {
  getAllStores: async () => {
    let stores: Store[] = [];

    try {
      databaseClient.connect();
      const result = await databaseClient.query(storeQueries.getAllStores());

      stores = result.rows.map(mapper.mapStore);
    } finally {
      databaseClient.end();
    }

    return stores;
  },
  getStore: async (id: number) => {
    let store: Store;

    try {
      databaseClient.connect();
      const result = await databaseClient.query(storeQueries.getStoreById(id));

      if (!result.rows.length) {
        throw new NotFoundError('Store not found');
      }

      store = result.rows.map(mapper.mapStore)[0] as Store;
    } finally {
      databaseClient.end();
    }

    return store;
  },
  getStoreWithOpeningsHours: async (id: number) => {
    let hours: DatabaseOpeningHours[] = [];

    try {
      databaseClient.connect();
      const result = await databaseClient.query(storeQueries.getStoreWithOpeningsHoursById(id));

      if (!result.rows.length) {
        throw new NotFoundError('Store not found');
      }

      hours = result.rows.map(mapper.mapHour);
    } finally {
      databaseClient.end();
    }

    return hours;
  },
  getBrandsByStoreId: async (id: number) => {
    let brands: DatabaseBrand[] = [];

    try {
      databaseClient.connect();
      const result = await databaseClient.query(storeQueries.getBrandsByStoreId(id));

      if (!result.rows.length) {
        throw new NotFoundError('Store not found');
      }

      brands = result.rows.map(mapper.mapBrand);
    } finally {
      databaseClient.end();
    }

    return brands;
  }
};
