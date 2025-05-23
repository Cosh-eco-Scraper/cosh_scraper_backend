import databasePool from '../config/dbConnectionConfig';
import NotFoundError from '../domain/errors/NotFoundError';
import { locationQuerries } from './queries/location.querries';
import { mapper } from './mapper';

export const LocationRepository = {
  updateLocation: async (
    locationId?: number,
    street?: string,
    number?: string,
    postal_code?: string,
    city?: string,
    country?: string,
  ): Promise<number> => {
    const result = await databasePool.query(
      locationQuerries.updateLocation(locationId, street, number, postal_code, city, country),
    );

    if (!result.rowCount) {
      throw new NotFoundError('Location not found');
    }

    return locationId as number;
  },

  createLocation: async (
    street: string,
    number: string,
    postal_code: string,
    city: string,
    country: string,
  ): Promise<Location> => {
    const result = await databasePool.query(
      locationQuerries.createLocation(street, number, postal_code, city, country),
    );

    if (!result.rowCount) {
      throw new NotFoundError('Location not found');
    }

    const location = result.rows.map(mapper.mapLocation)[0] as Location;
    return location;
  },
};
