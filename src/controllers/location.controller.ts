import { Request, Response, NextFunction } from 'express';
import LocationService from '../services/location.service';

export async function updateLocation(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { locationId } = req.params;
    const { street, number, postal_code, city, country } = req.body;

    if (!locationId) {
      res.status(400).json({ message: 'Brand ID is required' });
    }

    if (!street || !number || !postal_code || !city || !country) {
      res
        .status(400)
        .json({ message: 'Street, number, postal_code, city and country are required' });
    }

    const result = await LocationService.updateLocation(
      Number(locationId),
      street,
      number,
      postal_code,
      city,
      country,
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
