export const storeQueries = {
  getStoreById: (id: number) => `SELECT *
                                 FROM stores
                                 WHERE id = ${id};`,
  getAllStores: () => `SELECT *
                       FROM stores;`,
  getStoreWithOpeningsHoursById(id: number) {
    return `SELECT s.id          as store_id,
                   oh.id         as id,
                   oh.day        as "day",
                   oh.openingat as opening_at,
                   oh.closingat as closing_at,
                   oh.created_at as created_at,
                   oh.updated_at as updated_at
            FROM stores s
                   JOIN opening_hours oh ON oh.store_id = s.id
            WHERE s.id = ${id};`;
  }
};
