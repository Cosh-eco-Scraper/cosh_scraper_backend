import databasePool from '../config/dbConnectionConfig';
import NotFoundError from '../domain/errors/NotFoundError';
import { storeBrandsQueries } from './queries/storeBrands.querries';

export const storeBrandsRepository = {
  updateStoreBrands: async (storeId: number, brandId: number): Promise<void> => {
    const result = await databasePool.query(storeBrandsQueries.updateStoreBrands(storeId, brandId));

    if (!result.rowCount) {
      throw new NotFoundError('Store or brand not found');
    }
  },
};
