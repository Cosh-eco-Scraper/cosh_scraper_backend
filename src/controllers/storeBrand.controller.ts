import { Request, Response, NextFunction } from 'express';
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
    const storeId = req.params.storeId;
    const brandId = req.params.brandId;

    if (!storeId) {
      res.status(400).json({ message: 'Store ID is required' });
      return;
<<<<<<< 123-adding-and-delete-brands
    }

    if (!brandId) {
      res.status(400).json({ message: 'Brand ID is required' });
      return;
=======
>>>>>>> main
    }

    const updatedStoreId = await storeBrandsService.removeBrandFromStore(
      parseInt(storeId),
      parseInt(brandId),
    );

<<<<<<< 123-adding-and-delete-brands
    res.status(200).json({ rowAffected: updatedStoreId });
=======
    res.status(200).json({ id: updatedStoreId });
>>>>>>> main
    return;
  } catch (error) {
    next(error);
  }
}


