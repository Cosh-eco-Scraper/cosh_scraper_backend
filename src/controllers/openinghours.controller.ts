import { NextFunction, Request, Response } from 'express';
import OpeningHoursService from '../services/openingshours.service';

export async function updateOpeningHours(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { openingHoursId } = req.params;
    const { day, openingAt, closingAt, openingAtAfterNoon, closingAtAfterNoon, storeId } = req.body;

    console.log(openingAtAfterNoon, closingAtAfterNoon);

    if (!openingHoursId) {
      res.status(400).json({ message: 'Opening hours ID is required' });
      return;
    }

    if (!day || !openingAt || !closingAt || !storeId) {
      res.status(400).json({ message: 'Day, startTime, closingAt, and store_id are required' });
      return;
    }

    const result = await OpeningHoursService.updateOpeningHours(
      Number(openingHoursId),
      day,
      openingAt,
      closingAt,
      openingAtAfterNoon,
      closingAtAfterNoon,
      storeId,
    );
    res.status(200).json({ id: result });
    return;
  } catch (error) {
    next(error);
  }
}
