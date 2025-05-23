import { Brand } from '../domain/Brand';
import BrandRepository from '../repositories/brand.repository';

const updateBrand = async (brandId?: number, name?: string, label?: string): Promise<number> => {
  const result = await BrandRepository.updateBrand(brandId, name, label);
  return result;
};

const createBrand = async (name: string, label: string): Promise<Brand> => {
  const result = await BrandRepository.createBrand(name, label);
  return result;
};

const getAllBrands = async () => {
  const result = await BrandRepository.getAllBrands();
  return result;
};

const BrandService = {
  updateBrand,
  createBrand,
  getAllBrands,
};
export default BrandService;
