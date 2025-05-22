import databasePool from '../config/dbConnectionConfig';
import { brandQueries } from './queries/brands.queries';

export const BrandRepository = {
  updateBrand: async (brandId?: number, name?: string, label?: string): Promise<number> => {
    const result = await databasePool.query(brandQueries.updateBrand(brandId, name, label));

    console.log('Brand updated successfully', result);

    if (!result.rowCount) {
      throw new Error('Failed to update brand');
    }

    return brandId as number;
  },
};
