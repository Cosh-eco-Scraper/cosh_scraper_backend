export const storeQueries = {
  getStoreById: (id: number) => `SELECT *
                                 FROM stores
                                 WHERE id = ${id};`,
  getAllStores: () => `SELECT s.id,
                              s.name,
                              s.description,
                              l.street,
                              l.id         as location_id,
                              l.street,
                              l.number,
                              l.city,
                              l.postal_code,
                              l.country,
                              l.created_at as loc_created_at,
                              l.updated_at as loc_updated_at
                       FROM stores s
                              JOIN locations l ON s.location_id = l.id;`,
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
