import { Brand } from '../domain/Brand';
import BrandRepository from '../repositories/brand.repository';

const updateBrand = async (
  brandId: number,
  name: string,
  label: string | null,
): Promise<number> => {
  const result = await BrandRepository.updateBrand(brandId, name, label);
  return result;
};

const createBrand = async (name: string, label: string | null): Promise<Brand> => {
  const result = await BrandRepository.createBrand(name, label);
  return result;
};

const getAllBrands = async () => {
  const result = await BrandRepository.getAllBrands();
  return result;
};

const getBrandByName = async (name: string): Promise<Brand | null> => {
  const result = await BrandRepository.getBrandByName(name);
  return result;
};

const BrandService = {
  updateBrand,
  createBrand,
  getAllBrands,
  getBrandByName,
};
export default BrandService;
