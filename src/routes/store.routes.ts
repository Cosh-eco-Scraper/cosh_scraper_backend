import { Router } from 'express';
import {
  getAllStores,
  getStore,
  getStoreBrands,
  getStoreOpeningsHours,
  updateStore,
  createCompleteStore,
} from '../controllers/store.controller';

const router = Router();

router.get('/', getAllStores);
router.get('/:id', getStore);
router.put('/:id', updateStore);
router.get('/:id/openingshours', getStoreOpeningsHours);
router.get('/:id/brands', getStoreBrands);
router.post('/', createCompleteStore);
export default router;
