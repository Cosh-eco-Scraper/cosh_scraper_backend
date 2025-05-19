import { Brand } from '../domain/Brand';
import { Store } from '../domain/Store';

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

function mapBrands(databaseResult: any): Brand[] {
  return databaseResult.map((brand: any) => ({
    id: brand.id,
    name: brand.name,
    label: brand.label,
    createdAt: brand.created_at,
    updatedAt: brand.updated_at
  }));
}

export const storeMapper = {
  mapStore: (databaseResult: any) => mapStore(databaseResult)
};

export const brandMapper = {
  mapBrand: (databaseResult: any) => mapBrands(databaseResult),
  mapBrands: (databaseResult: any) => mapBrands(databaseResult)
};
