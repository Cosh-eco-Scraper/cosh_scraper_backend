import { Request, Response, NextFunction } from 'express';
import OpeningHoursService from "../services/openingshours.service";

export async function updateOpeningHours(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { openingHoursId } = req.params;
    const { day, startTime, endTime, storeId } = req.body;

    if (!openingHoursId) {
      res.status(400).json({ message: 'Opening hours ID is required' });
    }

    if (!day || !startTime || !endTime || !storeId) {
      res.status(400).json({ message: "Day, startTime, endTime, and store_id are required" });
    }

    const result = await OpeningHoursService.updateOpeningHours(Number(openingHoursId), day, startTime, endTime, storeId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}