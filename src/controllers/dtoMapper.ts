import { Store, StoreDto } from '../domain/Store';

export const dtoMapper = {
  mapStore: (store: Store): StoreDto => {
    return {
      id: store.id,
      description: store.description,
      name: store.name
    };
  }
};
