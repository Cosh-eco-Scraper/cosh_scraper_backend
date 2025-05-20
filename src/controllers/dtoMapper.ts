import { Store, StoreDto } from '../domain/Store';
import { DatabaseOpeningHours, OpeningHours, OpeningHoursDto } from '../domain/OpeningHours';

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
  }
};
