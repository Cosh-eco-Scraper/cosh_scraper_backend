import { storeBrandsRepository } from "../repositories/storeBrands.repository"


const updateStoreBrands = async (storeId: number, brandId: number) => {
    await storeBrandsRepository.updateStoreBrands(storeId, brandId);
}

const storeBrandsService = {
    updateStoreBrands,
}
export default storeBrandsService;