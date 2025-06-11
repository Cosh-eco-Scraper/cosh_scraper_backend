import { Router } from 'express';
import { getAllBrands, getBrandByName, updateBrand } from '../controllers/brand.controller';

const router = Router();

router.get('/', getAllBrands);
router.put('/:brandId', updateBrand);
router.get('/:name', getBrandByName);

export default router;
