import { Request, Response, NextFunction } from 'express';
import BrandService from '../services/brand.service';

export async function updateBrand(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { brandId } = req.params;
    const { name, label } = req.body;

    if (!brandId) {
      res.status(400).json({ message: 'Brand ID is required' });
    }

    if (!name || !label) {
      res.status(400).json({ message: 'Name and label are required' });
    }

    await BrandService.updateBrand(Number(brandId), name, label);
    res.status(200).json({ message: 'Brand updated successfully' });
  } catch (error) {
    next(error);
  }
}