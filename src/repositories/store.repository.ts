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
    const result = await databasePool.query(storeQueries.getStoreById(id));

    if (!result.rows.length) {
      throw new NotFoundError('Store not found');
    }

    return result.rows.map(mapper.mapStore)[0] as Store;
  },

  updateStore: async (storeId?: number, name?: string, description?: string) => {
    const result = await databasePool.query(storeQueries.updateStore(storeId, name, description));

    if (!result.rowCount) {
      throw new NotFoundError('Store not found');
    }
    return storeId as number;
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

    brands = result.rows.map(mapper.mapBrand);

    return brands;
  },

  getStoreTypesByStoreId: async (id: number) => {
    const query = storeQueries.getStoreTypesByStoreId();
    const params = [id];
    const result = await databasePool.query(query, params);

    const types = result.rows.map(mapper.mapStoreType);

    return types;
  },
  createStore: async (name: string, location_id: number, description?: string): Promise<Store> => {

    const querry = storeQueries.createStore();
    const params = [name, location_id, description];
    const result = await databasePool.query(querry, params);


    const store = result.rows.map(mapper.mapStore)[0] as Store;
    return store;
  },
};
