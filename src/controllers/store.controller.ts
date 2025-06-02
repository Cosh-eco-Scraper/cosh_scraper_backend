import { Request, Response, NextFunction } from 'express';
import { StoreService } from '../services/store.service';
import { dtoMapper } from './dtoMapper';

export async function getAllStores(_req: Request, res: Response, next: NextFunction) {
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
    const { name, description } = req.body;

    if (!storeId) {
      res.status(400).json({ message: 'Store ID is required' });
    }

    const updatedStoreId = await StoreService.updateStore(parseInt(storeId), name, description);

    res.status(200).json({ id: updatedStoreId });
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

export async function getStoreType(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.params.id;
    if (!storeId) {
      res.status(400).json({ message: 'Store ID is required' });
    }
    const storeTypes = await StoreService.getStoreTypesByStoreId(parseInt(storeId));
    if (!storeTypes.length) {
      res.status(204);
    }
    res.json(storeTypes.map(dtoMapper.mapStoreType));
  } catch (error) {
    next(error);
  }
}

export async function createCompleteStore(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { name, url, location } = req.body;

    if (!name || !url) {
      res.status(400).json({ message: 'Name and URL are required' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendSSE = (msg: string) => res.write(`data: ${msg}\n\n`);

    sendSSE('Starting to create store...');

    const store = await StoreService.createCompleteStore(name, url, location, sendSSE);

    res.status(201).json({ id: store.id, message: 'Store created successfully' });

    sendSSE('Store creation completed successfully!');
    res.write(`data: Store created successfully with ID: ${store.id}\n\n`);
    res.end();
  } catch (error) {
    res.write(`data: Error occurred: ${error}\n\n`);
    res.end();
    next(error);
  }
}
