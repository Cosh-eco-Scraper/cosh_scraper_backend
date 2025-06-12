import { Router } from 'express';
import { addBrandToStore, removeBrandFromStore } from '../controllers/storeBrand.controller';

const router = Router();

router.post('/', addBrandToStore);
router.delete('/:storeId/brands/:brandId', removeBrandFromStore); // Assuming this is for removing brands from a store
export default router;
