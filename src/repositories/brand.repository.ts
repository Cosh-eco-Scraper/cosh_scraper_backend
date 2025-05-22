import databasePool from '../config/dbConnectionConfig';
import { Brand } from '../domain/Brand';
import NotFoundError from '../domain/errors/NotFoundError';
import { mapper } from './mapper';
import { brandQueries } from './queries/brands.queries';

export const BrandRepository = {
  updateBrand: async (brandId?: number, name?: string, label?: string): Promise<number> => {
    try {
      databasePool.connect();

      const result = await databasePool.query(brandQueries.updateBrand(brandId, name, label));

      console.log('Brand updated successfully', result);

      if (!result.rowCount) {
        throw new NotFoundError('Brand not found');
      }
    } finally {
      return brandId as number;
    }
  },
};
