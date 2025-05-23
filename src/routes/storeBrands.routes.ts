import { Router } from 'express';
import { addBrandToStore } from '../controllers/storeBrand.controller';

const router = Router();

router.post('/', addBrandToStore);
export default router;
