import { Request, Response, NextFunction } from 'express';
import { StoreService } from '../services/store.service';

export async function getAllStores(req: Request, res: Response, next: NextFunction) {
  try {
    const stores = await StoreService.getAllStores();

    res.json(stores);
  } catch (error) {
    next(error);
  }
}
