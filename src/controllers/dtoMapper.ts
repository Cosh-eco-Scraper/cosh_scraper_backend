import { Store, StoreDto } from '../domain/Store';
import { DatabaseOpeningHours, OpeningHoursDto } from '../domain/OpeningHours';
import { BrandDto, BrandForListDto, DatabaseBrand, DatabaseBrandForList } from '../domain/Brand';
import { StoreType } from '../domain/StoreType';

export const dtoMapper = {
  mapStore: (store: Store): StoreDto => {
    return {
      id: store.id,
      description: store.description,
      name: store.name,
      retour: store.retour,
      street: store.location?.street ?? 'unknown',
      number: store.location?.number ?? 'unknown',
      city: store.location?.city ?? 'unknown',
      postalCode: store.location?.postalCode ?? 'unknown',
      country: store.location?.country ?? 'unknown',
      locationId: store.location?.id,
    };
  },

  mapOpeningHours: (openingHours: DatabaseOpeningHours): OpeningHoursDto => {
    return {
      id: openingHours.id,
      day: openingHours.day.name,
      openingAt: openingHours.openingAt,
      closingAt: openingHours.closingAt,
      storeId: openingHours.storeId,
    };
  },
  mapBrand: (brand: DatabaseBrand): BrandDto => {
    return {
      id: brand.id,
      name: brand.name,
      label: brand.label,
      storeId: brand.storeId,
    };
  },

  mapStoreType: (storeType: StoreType): StoreType => {
    return {
      id: storeType.id,
      name: storeType.name,
      description: storeType.description,
    };
  },

  mapBrandsforAll: (brand: DatabaseBrandForList): BrandForListDto => {
    return {
      id: brand.id,
      name: brand.name,
      label: brand.label,
    };
  },
};
