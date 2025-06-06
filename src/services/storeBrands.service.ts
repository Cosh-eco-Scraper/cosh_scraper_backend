import { storeBrandsRepository } from '../repositories/storeBrands.repository';

const addBrandToStore = async (storeId: number, brandId: number): Promise<number> => {
  const result = await storeBrandsRepository.addBrandToStore(storeId, brandId);
  return result;
};

const storeBrandsService = {
  addBrandToStore,
};
export default storeBrandsService;
