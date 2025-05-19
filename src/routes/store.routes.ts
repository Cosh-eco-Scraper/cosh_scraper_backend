import { Router } from 'express';
import { getAllStores, getStore } from '../controllers/store.controller';

const router = Router();

router.get('/', getAllStores);
router.get('/:id', getStore);

export default router;
