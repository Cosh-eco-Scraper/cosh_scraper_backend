import { storeTypeQueries } from './queries/storeType.queries';
import databasePool from '../config/dbConnectionConfig';

export const StoreTypeRepository = {
  async addTypeToStore(typeId: number, storeId: number) {
    const query = storeTypeQueries.addStoreType();

    await databasePool.query(query, [typeId, storeId]);
  },
  async removeTypeFromStore(typeId: number, storeId: number) {
    const query = storeTypeQueries.removeStoreType();

    await databasePool.query(query, [typeId, storeId]);
  },
};
