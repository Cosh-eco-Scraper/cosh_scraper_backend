import { BrandRepository } from '../repositories/brand.repository';

const updateBrand = async (brandId?: number, name?: string, label?: string): Promise<number> => {
  const result = await BrandRepository.updateBrand(brandId, name, label);
  return result;
};

const BrandService = {
  updateBrand,
};
export default BrandService;
