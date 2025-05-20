import { Store, StoreDto } from '../domain/Store';
import { DatabaseOpeningHours, OpeningHours, OpeningHoursDto } from '../domain/OpeningHours';
import { BrandDto, DatabaseBrand } from '../domain/Brand';

export const dtoMapper = {
  mapStore: (store: Store): StoreDto => {
    return {
      id: store.id,
      description: store.description,
      name: store.name
    };
  },
  mapOpeningHours: (openingHours: DatabaseOpeningHours): OpeningHoursDto => {
    return {
      id: openingHours.id,
      day: openingHours.day.name,
      openingAt: openingHours.openingAt,
      closingAt: openingHours.closingAt,
      storeId: openingHours.storeId
    };
  },
  mapBrand: (brand: DatabaseBrand): BrandDto => {
    return {
      id: brand.id,
      name: brand.name,
      label: brand.label,
      storeId: brand.storeId
    };
  }
};
