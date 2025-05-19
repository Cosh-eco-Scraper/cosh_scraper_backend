import { Router } from 'express';
import { getAllStores } from '../controllers/store.controller';

const router = Router();

router.get('/', getAllStores);

export default router;
