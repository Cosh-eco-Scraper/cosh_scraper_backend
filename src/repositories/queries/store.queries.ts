export const storeQueries = {
  getStoreById: (id: number) => `SELECT *
                                 FROM stores
                                 WHERE id = ${id};`,
  getAllStores: () => `SELECT *
                       FROM stores;`,

  updateStore: (storeId: number, name: string, location_id: number, description?: string) =>
    `UPDATE stores
                                                    SET name = '${name}',
                                                    description = '${description}',
                                                    location_id = '${location_id}'
                                                    WHERE id = ${storeId};`
};
