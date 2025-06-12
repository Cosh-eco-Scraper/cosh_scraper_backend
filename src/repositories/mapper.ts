import { Store } from '../domain/Store';
import { Day } from '../domain/Day';
import { DatabaseOpeningHours } from '../domain/OpeningHours';
import { DatabaseBrand, DatabaseBrandForList } from '../domain/Brand';
import { Location } from '../domain/Location';
import { StoreType } from '../domain/StoreType';
import { Statement } from '../domain/Statement';

function mapStore(databaseResult: any): Store {
  return {
    id: databaseResult.id,
    name: databaseResult.name,
    description: databaseResult.description,
    retour: databaseResult.retour,
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
      updatedAt: databaseResult.loc_updated_at,
    },
  };
}

function mapStatement(databaseResult: any): Statement {
  return {
    id: databaseResult.id,
    statement: databaseResult.statement,
  };
}

function mapBrand(databaseResult: any): DatabaseBrand {
  return {
    id: databaseResult.id,
    name: databaseResult.name,
    storeId: databaseResult.store_id,
    label: databaseResult.label,
  };
}

function mapStoreType(databaseResult: any): StoreType {
  return {
    id: databaseResult.id,
    name: databaseResult.name,
    description: databaseResult.description,
  };
}

function mapBrandForList(databaseResult: any): DatabaseBrandForList {
  return {
    id: databaseResult.id,
    name: databaseResult.name,
    label: databaseResult.label,
  };
}

function mapHours(databaseResult: any): DatabaseOpeningHours {
  return {
    id: databaseResult.id,
    day: {
      name: databaseResult.day,
      orderValue: Day[databaseResult.day as keyof typeof Day],
    },
    openingAt: databaseResult.opening_at,
    closingAt: databaseResult.closing_at,
    openingAtAfterNoon: databaseResult.closing_at_after_noon,
    closingAtAfterNoon: databaseResult.closing_at_after_noon,
    storeId: databaseResult.store_id,
    createdAt: databaseResult.created_at,
    updatedAt: databaseResult.updated_at,
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
    updatedAt: databaseResult.updated_at,
  };
}

export const mapper = {
  mapStore: (databaseResult: any) => mapStore(databaseResult),
  mapHour: (databaseResult: any) => mapHours(databaseResult),
  mapBrand: (databaseResult: any) => mapBrand(databaseResult),
  mapLocation: (databaseResult: any) => mapLocation(databaseResult),
  mapBrandForList: (databaseResult: any) => mapBrandForList(databaseResult),
  mapStoreType: (databaseResult: any) => mapStoreType(databaseResult),
  mapStatement: (databaseResult: any) => mapStatement(databaseResult),
};
