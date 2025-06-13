import { NextFunction, Request, Response } from 'express';
import storeTypeService from '../services/storeTypeService';
import NotFoundError from '../domain/errors/NotFoundError';

function validateTypeAndStoreId(typeId: any, storeId: any, res: Response): boolean {
  if (typeId === undefined || storeId === undefined) {
    if (typeId === undefined && storeId === undefined) {
      res.status(400).json({ message: 'Type ID and store ID are required' });
      return false;
    }
    if (typeId === undefined) {
      res.status(400).json({ message: 'Type ID is required' });
      return false;
    }
    if (storeId === undefined) {
      res.status(400).json({ message: 'Store ID is required' });
      return false;
    }
    return false;
  }
  return true;
}

export async function addTypeToStore(req: Request, res: Response, next: NextFunction) {
  let { typeId, storeId } = req.body;
  try {
    if (!validateTypeAndStoreId(typeId, storeId, res)) {
      return;
    }

    await storeTypeService.addTypeToStore(typeId, storeId);
    res.status(200);
    return;
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ message: error.message });
      return;
    }

    next(error);
  }
}

export async function removeTypeFromStore(req: Request, res: Response, next: NextFunction) {
  let { typeId, storeId } = req.body;
  try {
    if (!validateTypeAndStoreId(typeId, storeId, res)) {
      return;
    }
    await storeTypeService.removeTypeFromStore(typeId, storeId);
    res.status(200);
    return;
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ message: error.message });
      return;
    }

    next(error);
  }
}
