import { Brand } from '../domain/Brand';
import { Store, StoreDto } from '../domain/Store';

export const dtoMapper = {
  mapStore: (store: Store): StoreDto => {
    return {
      id: store.id,
      description: store.description,
      name: store.name
    };
  },

  mapBrand: (brand: Brand): Brand => {
    return {
      id: brand.id,
      name: brand.name,
      label: brand.label,
    };

  }
};
