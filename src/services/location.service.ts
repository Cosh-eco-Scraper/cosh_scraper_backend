import { LocationRepository } from "../repositories/location.repository"

const updateLocation = async (locationId?: number, street?: string, number?: string, postal_code?: string, city?: string, country?: string): Promise<void> => {
    await LocationRepository.updateLocation(locationId, street, number, postal_code, city, country)
}


const LocationService = {
    updateLocation,
};


export default LocationService;