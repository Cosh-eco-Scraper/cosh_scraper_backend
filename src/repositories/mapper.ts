import { Store } from '../domain/Store';
import { Day } from '../domain/Day';
import { DatabaseOpeningHours } from '../domain/OpeningHours';
import { DatabaseBrand } from '../domain/Brand';

function mapStore(databaseResult: any): Store {
  return {
    id: databaseResult.id,
    name: databaseResult.name,
    description: databaseResult.description,
    createdAt: databaseResult.created_at,
    updatedAt: databaseResult.updated_at,
    location: {
      id: databaseResult.location_id,
      street: databaseResult.street,
      number: databaseResult.number,
      city: databaseResult.city,
      postalCode: databaseResult.postal_code,
      country: databaseResult.country,
      createdAt: databaseResult.loc_created_at,
      updatedAt: databaseResult.loc_updated_at
    }
  };
}

function mapHours(databaseResult: any): DatabaseOpeningHours {
  return {
    id: databaseResult.id,
    day: {
      name: databaseResult.day,
      orderValue: Day[databaseResult.day as keyof typeof Day]
    },
    openingAt: databaseResult.opening_at,
    closingAt: databaseResult.closing_at,
    storeId: databaseResult.store_id,
    createdAt: databaseResult.created_at,
    updatedAt: databaseResult.updated_at
  };
}

function mapBrand(databaseResult: any): DatabaseBrand {
  return {
    id: databaseResult.id,
    name: databaseResult.name,
    storeId: databaseResult.store_id,
    label: databaseResult.label
  };
}

export const mapper = {
  mapStore: (databaseResult: any) => mapStore(databaseResult),
  mapHour: (databaseResult: any) => mapHours(databaseResult),
  mapBrand: (databaseResult: any) => mapBrand(databaseResult)
};
