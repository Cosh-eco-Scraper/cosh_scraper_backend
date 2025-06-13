import { Router } from 'express';
import { addBrandsToStore, removeBrandFromStore } from '../controllers/storeBrand.controller';

const router = Router();

router.post('/:id/brands', addBrandsToStore); // Assuming this is for adding brands to a store
router.delete('/', removeBrandFromStore); // Assuming this is for removing brands from a store
export default router;
