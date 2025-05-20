import { Request, Response, NextFunction } from 'express';
import OpeningHoursService from "../services/openingshours.service";

export async function updateOpeningHours(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { openingHoursId } = req.params;
    const { day, startTime, endTime } = req.body;

    if (!openingHoursId) {
      res.status(400).json({ message: 'Opening hours ID is required' });
      return;
    }

    if (!day || !startTime || !endTime) {
      res.status(400).json({ message: 'Day, startTime and endTime are required' });
      return;
    }

    await OpeningHoursService.updateOpeningHours(Number(openingHoursId), day, startTime, endTime);
    res.status(200).json({ message: 'Opening hours updated successfully' });
  } catch (error) {
    next(error);
  }
}