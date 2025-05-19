import { Store } from '../domain/Store';
import { Day } from '../domain/Day';
import { DatabaseOpeningHours } from '../domain/OpeningHours';

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

export const mapper = {
  mapStore: (databaseResult: any) => mapStore(databaseResult),
  mapHours: (databaseResult: any) => mapHours(databaseResult)
};
