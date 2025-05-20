import { Store } from '../domain/Store';
import { Day } from '../domain/Day';
import { DatabaseOpeningHours } from '../domain/OpeningHours';
import { DatabaseBrand } from '../domain/Brand';
import { Location } from '../domain/Location';

function mapStore(databaseResult: any): Store {
  return {
    id: databaseResult.id,
    name: databaseResult.name,
    description: databaseResult.description,
    createdAt: databaseResult.created_at,
    updatedAt: databaseResult.updated_at,
    brands: []
  };
}

function mapBrand(databaseResult: any): DatabaseBrand {
  return {
    id: databaseResult.id,
    name: databaseResult.name,
    storeId: databaseResult.store_id,
    label: databaseResult.label,
  }
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

function mapLocation(databaseResult: any): Location {
  return {
    id: databaseResult.id,
    street: databaseResult.street,
    number: databaseResult.number,
    postalCode: databaseResult.postal_code,
    city: databaseResult.city,
    country: databaseResult.country,
    createdAt: databaseResult.created_at,
    updatedAt: databaseResult.updated_at
  };
}

export const mapper = {
  mapStore: (databaseResult: any) => mapStore(databaseResult),
  mapHour: (databaseResult: any) => mapHours(databaseResult),
  mapBrand: (databaseResult: any) => mapBrand(databaseResult),
  mapLocation: (databaseResult: any) => mapLocation(databaseResult)
};
