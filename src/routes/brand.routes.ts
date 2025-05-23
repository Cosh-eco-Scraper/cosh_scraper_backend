import { Router } from 'express';
import { getAllBrands, updateBrand } from '../controllers/brand.controller';

const router = Router();

router.get('/', getAllBrands);
router.put('/:brandId', updateBrand);

export default router;
