import { Router } from 'express';
import { getAllStores, getStore, getStoreOpeningsHours } from '../controllers/store.controller';

const router = Router();

router.get('/', getAllStores);
router.get('/:id', getStore);
router.get('/:id/openingshours', getStoreOpeningsHours);

export default router;
