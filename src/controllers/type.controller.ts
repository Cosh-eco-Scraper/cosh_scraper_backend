import { NextFunction, Request, Response } from 'express';
import TypeService from '../services/type.service';
import { dtoMapper } from './dtoMapper';

export async function GetAllTypes(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const types = await TypeService.getAllTypes();
    res.json(types.map(dtoMapper.mapType));
    return;
  } catch (error) {
    next(error);
  }
}
