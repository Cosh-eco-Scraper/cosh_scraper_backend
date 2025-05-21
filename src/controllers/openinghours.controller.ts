import { Request, Response, NextFunction } from 'express';
import OpeningHoursService from "../services/openingshours.service";

export async function updateOpeningHours(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { openingHoursId } = req.params;
    const { day, startTime, endTime, store_id } = req.body;

    if (!openingHoursId) {
      res.status(400).json({ message: 'Opening hours ID is required' });
    }

    if (!day || !startTime || !endTime || !store_id) {
      res.status(400).json({ message: "Day, startTime, endTime, and store_id are required" });
    }

    await OpeningHoursService.updateOpeningHours(Number(openingHoursId), day, startTime, endTime, store_id);
    res.status(200).json({ message: 'Opening hours updated successfully' });
  } catch (error) {
    next(error);
  }
}