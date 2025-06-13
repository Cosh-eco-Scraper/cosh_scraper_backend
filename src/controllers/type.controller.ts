import { NextFunction, Request, Response } from 'express';
import TypeService from '../services/type.service';
import { dtoMapper } from './dtoMapper';

export async function GetAllTypes(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const types = await TypeService.getAllTypes();

    if (types.length === 0) {
      res.status(204).end();
      console.log('No types found');
      return;
    }

    res.json(types.map(dtoMapper.mapType));
    return;
  } catch (error) {
    next(error);
  }
}
