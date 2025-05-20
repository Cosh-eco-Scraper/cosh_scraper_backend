import { Request, Response, NextFunction } from 'express';
import { StoreService } from '../services/store.service';
import { dtoMapper } from './dtoMapper';

export async function getAllStores(req: Request, res: Response, next: NextFunction) {
  try {
    const stores = await StoreService.getAllStores();
    res.json(stores.map(dtoMapper.mapStore));
  } catch (error) {
    next(error);
  }
}

export async function getStore(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.params.id;

    if (!storeId) {
      res.status(400).json({ message: 'Store ID is required' });
    }

    const store = await StoreService.getStore(parseInt(storeId));

    if (!store) {
      res.status(404).json({ message: 'Store not found' });
    }

    res.json(dtoMapper.mapStore(store));
  } catch (error) {
    next(error);
  }
}

export async function updateStore(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.params.id;
    const { name, location_id, description } = req.body;

    if (!storeId) {
      res.status(400).json({ message: 'Store ID is required' });
    }

    await StoreService.updateStore(parseInt(storeId), name, location_id, description);


    res.status(200).json({ message: 'Store updated successfully' });
  } catch (error) {
    next(error);
  }
}

export async function getStoreOpeningsHours(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.params.id;

    if (!storeId) {
      res.status(400).json({ message: 'Store ID is required' });
    }

    const hours = await StoreService.getOpeningsHoursByStoreId(parseInt(storeId));

    if (!hours.length) {
      res.status(204).json({ message: 'No opening hours found' });
    }

    res.json(hours.map(dtoMapper.mapOpeningHours));
  } catch (error) {
    next(error);
  }
}

export async function getStoreBrands(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.params.id;

    if (!storeId) {
      res.status(400).json({ message: 'Store ID is required' });
    }

    const brands = await StoreService.getBrandsByStoreId(parseInt(storeId));

    if (!brands.length) {
      res.status(204).json({ message: 'No opening hours found' });
    }

    res.json(brands.map(dtoMapper.mapBrand));
  } catch (error) {
    next(error);
  }
}
