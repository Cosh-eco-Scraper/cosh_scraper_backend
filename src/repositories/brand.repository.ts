import { get } from 'http';
import databasePool from '../config/dbConnectionConfig';
import { Brand } from '../domain/Brand';
import { mapper } from './mapper';
import { brandQueries } from './queries/brands.queries';

const BrandRepository = {
  updateBrand: async (brandId?: number, name?: string, label?: string): Promise<number> => {
    const result = await databasePool.query(brandQueries.updateBrand(brandId, name, label));

    console.log('Brand updated successfully', result);

    if (!result.rowCount) {
      throw new Error('Failed to update brand');
    }

    return brandId as number;
  },

  createBrand: async (name: string, label: string): Promise<Brand> => {
    const result = await databasePool.query(brandQueries.createBrand(name, label));

    console.log('Brand created successfully', result);

    if (!result.rowCount) {
      throw new Error('Failed to create brand');
    }

    const brand = result.rows.map(mapper.mapBrand)[0] as Brand;
    return brand;
  },

  getAllBrands: async () => {
    const result = await databasePool.query(brandQueries.getAllBrands());
    let brands: Brand[] = [];

    brands = result.rows.map(mapper.mapBrandForList);
    return brands;
  },
};

export default BrandRepository;
