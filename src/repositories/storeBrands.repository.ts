import databasePool from '../config/dbConnectionConfig';
import NotFoundError from '../domain/errors/NotFoundError';
import { storeBrandsQueries } from './queries/storeBrands.querries';

export const storeBrandsRepository = {
  async addBrandToStore(storeId: number, brandId: number): Promise<number> {
    // Check if store exists
    const storeRes = await databasePool.query('SELECT 1 FROM stores WHERE id = $1', [storeId]);
    if (storeRes.rowCount === 0) {
      throw new NotFoundError('Store not found');
    }

    // Check if brand exists
    const brandRes = await databasePool.query('SELECT 1 FROM brands WHERE id = $1', [brandId]);
    if (brandRes.rowCount === 0) {
      throw new NotFoundError('Brand not found');
    }

    // Check if association already exists
    const assocRes = await databasePool.query(
      'SELECT 1 FROM store_brands WHERE store_id = $1 AND brand_id = $2',
      [storeId, brandId],
    );
    if (assocRes.rowCount > 0) {
      throw new Error('Brand is already associated with this store');
    }

    // Insert association
    const query = storeBrandsQueries.addBrandToStore();
    const result = await databasePool.query(query, [storeId, brandId]);
    if (result.rowCount === 0) {
      throw new Error('Failed to associate brand with store');
    }
    return result.rowCount;
  },
};
