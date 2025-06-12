import { Request, Response, NextFunction } from 'express';
import storeBrandsService from '../services/storeBrands.service';

export async function addBrandToStore(req: Request, res: Response, next: NextFunction) {
  try {
    const { storeId, brandId } = req.body;

    if (!storeId) {
      res.status(400).json({ message: 'Store ID is required' });
    }

    const updatedStoreId = await storeBrandsService.addBrandToStore(parseInt(storeId), brandId);

    res.status(200).json({ id: updatedStoreId });
  } catch (error) {
    next(error);
  }
}

export async function removeBrandFromStore(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.params.storeId;
    const brandId = req.params.brandId;

    if (!storeId) {
      res.status(400).json({ message: 'Store ID is required' });
    }

    if (!brandId) {
      res.status(400).json({ message: 'Brand ID is required' });
    }

    const updatedStoreId = await storeBrandsService.removeBrandFromStore(
      parseInt(storeId),
      parseInt(brandId),
    );

    res.status(200).json({ rowAffected: updatedStoreId });
  } catch (error) {
    next(error);
  }
}
