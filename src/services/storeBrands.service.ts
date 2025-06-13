import { storeBrandsRepository } from '../repositories/storeBrands.repository';
import BrandService from './brand.service';

const addBrandToStore = async (storeId: number, brandId: number): Promise<number> => {
  const result = await storeBrandsRepository.addBrandToStore(storeId, brandId);
  return result;
};

const removeBrandFromStore = async (storeId: number, brandId: number): Promise<number | null> => {
  const result = await storeBrandsRepository.removeBrandFromStore(storeId, brandId);
  return result;
};

const addBrandsToStore = async (storeId: number, brands: string[]): Promise<string | void> => {
    if (!Array.isArray(brands) || brands.length === 0) {
      return;
    }

    for (const brandName of brands) {
      try {
        // 1) Try to fetch existing brand
        let brand = await BrandService.getBrandByName(brandName);

        // 2) If it doesn't exist, create it
        if (!brand) {
          brand = await BrandService.createBrand(brandName, null);
        }

        // 3) Link it to the store
        await storeBrandsService.addBrandToStore(storeId, brand.id);
      } catch (err) {
        // Log the error and continue with the next brand
        console.log(`Failed to add brand "${brandName}" to store ${storeId}:`, err);
        continue;
      }
    }

    return `Brands added to store ${storeId} successfully.`;
  }

const storeBrandsService = {
  addBrandToStore,
  removeBrandFromStore,
  addBrandsToStore,
};
export default storeBrandsService;
