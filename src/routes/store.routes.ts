import { Router } from 'express';
import { getAllStores, getStore, updateStore } from '../controllers/store.controller';

const router = Router();

router.get('/', getAllStores);
router.get('/:id', getStore);
router.put('/:id', updateStore);

export default router;
