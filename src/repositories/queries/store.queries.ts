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
                                                    WHERE id = ${storeId};`,
  getStoreWithOpeningsHoursById(id: number) {
    return `SELECT s.id          as store_id,
                                                                     oh.id         as id,
                                                                     oh.day        as "day",
                                                                     oh.openingat  as opening_at,
                                                                     oh.closingat  as closing_at,
                                                                     oh.created_at as created_at,
                                                                     oh.updated_at as updated_at
                                                              FROM stores s
                                                                     JOIN opening_hours oh ON oh.store_id = s.id
                                                              WHERE s.id = ${id};`;
  },
  getBrandsByStoreId(id: number) {
    return `select b.id, b.name, b.label, sb.store_id
                                                              from stores s
                                                                     join store_brands sb on sb.store_id = s.id
                                                                     join brands b on b.id = sb.brand_id
                                                              WHERE s.id = ${id};`;
  }
};
