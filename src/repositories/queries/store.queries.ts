export const storeQueries = {
  getStoreById: (id: number) => `SELECT *
                                 FROM stores
                                 WHERE id = ${id};`,
  getAllStores: () => `SELECT *
                       FROM stores;`
};
