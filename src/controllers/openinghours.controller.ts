import { Request, Response, NextFunction } from 'express';
import OpeningHoursService from '../services/openingshours.service';

export async function updateOpeningHours(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { openingHoursId } = req.params;
    const { day, openingAt, closingAt, storeId } = req.body;

    if (!openingHoursId) {
      res.status(400).json({ message: 'Opening hours ID is required' });
    }

    if (!day || !openingAt || !closingAt || !storeId) {
      res.status(400).json({ message: 'Day, startTime, closingAt, and store_id are required' });
    }

    const result = await OpeningHoursService.updateOpeningHours(
      Number(openingHoursId),
      day,
      openingAt,
      closingAt,
      storeId,
    );
    res.status(200).json({ id: result });
  } catch (error) {
    next(error);
  }
}
