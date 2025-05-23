import databasePool from '../config/dbConnectionConfig';
import NotFoundError from '../domain/errors/NotFoundError';
import { locationQuerries } from './queries/location.querries';
import { Location } from '../domain/Location';
import { mapper } from './mapper';

export const LocationRepository = {
  updateLocation: async (
    locationId?: number,
    street?: string,
    number?: string,
    postalCode?: string,
    city?: string,
    country?: string,
  ): Promise<number> => {
    const result = await databasePool.query(
      locationQuerries.updateLocation(locationId, street, number, postalCode, city, country),
    );

    if (!result.rowCount) {
      throw new NotFoundError('Location not found');
    }

    return locationId as number;
  },

  createLocation: async (
    street: string,
    number: string,
    postalCode: string,
    city: string,
    country: string,
  ): Promise<Location> => {
    const result = await databasePool.query(
      locationQuerries.createLocation(street, number, postalCode, city, country),
    );

    if (!result.rowCount) {
      throw new NotFoundError('Location not found');
    }

    const location = result.rows.map(mapper.mapLocation)[0] as Location;
    return location;
  },
};
