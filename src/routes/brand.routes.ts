import { Router } from 'express';
import { updateBrand } from '../controllers/brand.controller';

const router = Router();

router.put('/:brandId', updateBrand);
export default router;
