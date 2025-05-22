import { LocationRepository } from '../repositories/location.repository';

const updateLocation = async (
  locationId?: number,
  street?: string,
  number?: string,
  postal_code?: string,
  city?: string,
  country?: string,
): Promise<number> => {
  const result = await LocationRepository.updateLocation(
    locationId,
    street,
    number,
    postal_code,
    city,
    country,
  );
  return result;
};

const createLocation = async (
  street: string,
  number: string,
  postal_code: string,
  city: string,
  country: string,
): Promise<Location> => {
  const result = await LocationRepository.createLocation(
    street,
    number,
    postal_code,
    city,
    country,
  );
  return result;
};

const LocationService = {
  updateLocation,
  createLocation,
};

export default LocationService;
