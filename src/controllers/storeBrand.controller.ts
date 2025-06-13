import { NextFunction, Request, Response } from 'express';
import storeBrandsService from '../services/storeBrands.service';

export async function addBrandsToStore(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.params.id;
    const { brands } = req.body;

    if (!storeId || !brands || !Array.isArray(brands)) {
      res.status(400).json({ message: 'Store ID and brand IDs are required' });
      return;
    }

    const result = await storeBrandsService.addBrandsToStore(parseInt(storeId), brands);
    res.status(200).json({ message: result });
    return;
  } catch (error) {
    next(error);
  }
}
export async function removeBrandFromStore(req: Request, res: Response, next: NextFunction) {
  try {
    const { storeId, brandId } = req.body;
    if (!storeId && !brandId) {
      res.status(400).json({ message: 'Store ID and Brand ID are required' }).end();
      return;
    }

    if (!storeId) {
      res.status(400).json({ message: 'Store ID is required' }).end();
      return;
    }

    if (!brandId) {
      res.status(400).json({ message: 'Brand ID is required' }).end();
      return;
    }
    const updatedStoreId = await storeBrandsService.removeBrandFromStore(
      parseInt(storeId),
      parseInt(brandId),
    );

    res.status(200).json({ rowAffected: updatedStoreId }).end();
    return;
  } catch (error) {
    next(error);
  }
}
