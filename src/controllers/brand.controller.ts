import { Request, Response, NextFunction } from 'express';
import BrandService from '../services/brand.service';

export async function updateBrand(req: Request, res:Response, next: NextFunction) {
  try {
    const brandId = req.params.id;
    const { name, label } = req.body;

    if (!brandId) {
      return res.status(400).json({ message: 'Brand ID is required' });
    }

    if (!name || !label) {
      return res.status(400).json({ message: 'Name and label are required' });
    }

    const updatedBrand = await BrandService.updateBrand(Number(brandId), name, label);
    console.log('Updated brand:', updatedBrand);
    res.status(200).json({ message: 'Brand updated successfully' });
  } catch (error) {
    next(error);
  }
}