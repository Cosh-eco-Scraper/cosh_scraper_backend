import databasePool from '../config/dbConnectionConfig';
import NotFoundError from '../domain/errors/NotFoundError';
import { locationQueries } from './queries/location.querries';
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
    // const result = await databasePool.query(
    //   locationQueries.updateLocation(locationId, street, number, postalCode, city, country),
    // );
    const querry = locationQueries.updateLocation();
    const params = [street, number, postalCode, city, country, locationId];
    const result = await databasePool.query(querry, params);

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
    // const result = await databasePool.query(
    //   locationQueries.createLocation(street, number, postalCode, city, country),
    // );
    const querry = locationQueries.createLocation();
    const params = [street, number, postalCode, city, country];
    const result = await databasePool.query(querry, params);

    if (!result.rowCount) {
      throw new NotFoundError('Location not found');
    }

    const location = result.rows.map(mapper.mapLocation)[0] as Location;
    return location;
  },
};
