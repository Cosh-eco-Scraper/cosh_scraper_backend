import databasePool from '../config/dbConnectionConfig';
import { Brand } from '../domain/Brand';
import { mapper } from './mapper';
import { brandQueries } from './queries/brands.queries';

const BrandRepository = {
  createBrand: async (name: string, label: string | null) => {
    const result = await databasePool.query(brandQueries.createBrand(), [name, label]);
    return result.rows[0];
  },

  updateBrand: async (brandId: number, name: string, label: string | null) => {
    const result = await databasePool.query(brandQueries.updateBrand(), [name, label, brandId]);
    return result.rows[0];
  },

  getAllBrands: async () => {
    const result = await databasePool.query(brandQueries.getAllBrands());
    let brands: Brand[] = [];

    brands = result.rows.map(mapper.mapBrandForList);
    return brands;
  },

  getBrandByName: async (name: string) => {
    const result = await databasePool.query(brandQueries.getBrandbyName(), [name]);
    if (result.rows.length === 0) {
      return null;
    }
    return mapper.mapBrandForList(result.rows[0]);
  },
};

export default BrandRepository;
