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

export const mapper = {
  mapStore: (databaseResult: any) => mapStore(databaseResult)
};
