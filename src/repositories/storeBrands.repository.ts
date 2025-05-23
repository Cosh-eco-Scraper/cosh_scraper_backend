import databasePool from '../config/dbConnectionConfig';
import NotFoundError from '../domain/errors/NotFoundError';
import { storeBrandsQueries } from './queries/storeBrands.querries';

export const storeBrandsRepository = {
  addBrandToStore: async (storeId: number, brandId: number): Promise<number> => {
    const result = await databasePool.query(storeBrandsQueries.addBrandToStore(storeId, brandId));

    if (!result.rowCount) {
      throw new NotFoundError('Store or brand not found');
    }

    return brandId;
  },


};
