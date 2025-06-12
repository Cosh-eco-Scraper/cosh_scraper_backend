import { Router } from 'express';
import {
  getAllStores,
  getStore,
  getStoreBrands,
  getStoreOpeningsHours,
  updateStore,
  createCompleteStore,
  getStoreType,
  addBrandsToStore,
} from '../controllers/store.controller';

const router = Router();

router.get('/', getAllStores);
router.get('/:id', getStore);
router.put('/:id', updateStore);
router.get('/:id/openingshours', getStoreOpeningsHours);
router.get('/:id/brands', getStoreBrands);
router.get('/:id/types', getStoreType);
router.post('/', createCompleteStore);
router.post('/:id/brands', addBrandsToStore); // Assuming this is for adding brands to a store

export default router;
