import { Router, Request, Response, NextFunction } from 'express';
import { updateBrand } from '../controllers/brand.controller';

const router = Router();

router.put('/:brandId', (req: Request, res: Response, next: NextFunction) => {
	updateBrand(req, res, next);
});
export default router;
