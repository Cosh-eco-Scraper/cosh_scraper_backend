import { Request, Response, NextFunction } from 'express';
import BrandService from '../services/brand.service';
import { dtoMapper } from './dtoMapper';

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

    const result = await BrandService.updateBrand(Number(brandId), name, label);
    res.status(200).json({ id: result });
  } catch (error) {
    next(error);
  }
}

export async function getAllBrands(_req: Request, res: Response, next: NextFunction) {
    try {
      const brands = await BrandService.getAllBrands();
      res.json(brands.map(dtoMapper.mapBrandsforAll));
    } catch (error) {
      next(error);
    }
}

