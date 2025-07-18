export const storeQueries = {
  getStoreById: () => `
         SELECT s.id,
                s.name,
                s.description,
                s.retour,
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
                JOIN locations l ON s.location_id = l.id
         WHERE s.id = $1;
       `,

  getAllStores: () => `
         SELECT s.id,
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
                JOIN locations l ON s.location_id = l.id;
       `,

  getStoreWithOpeningsHoursById: () => `SELECT s.id                  as store_id,
                                               oh.id                 as id,
                                               oh.day                as "day",
                                               oh.openingat          as opening_at,
                                               oh.closingat          as closing_at,
                                               oh.openingatAfterNoon as opening_at_after_noon,
                                               oh.closingatAfterNoon as closing_at_after_noon,
                                               oh.created_at         as created_at,
                                               oh.updated_at         as updated_at
                                        FROM stores s
                                               JOIN opening_hours oh ON oh.store_id = s.id
                                        WHERE s.id = $1;`,
  getBrandsByStoreId: () => `
         SELECT b.id, b.name, b.label, sb.store_id
         FROM stores s
                JOIN store_brands sb ON sb.store_id = s.id
                JOIN brands b ON b.id = sb.brand_id
         WHERE s.id = $1;
       `,

  getStoreTypesByStoreId() {
    return `SELECT t.id, t.name, t.description
                        FROM stores s
                                  JOIN store_types st ON st.store_id = s.id
                                  JOIN types t ON t.id = st.type_id
                        WHERE s.id = $1;`;
  },

  updateStore: () => `
    UPDATE stores
    SET name        = $1,
        description = $2,
        retour      = $3
    WHERE id = $4;
  `,

  createStore: () => `
    INSERT INTO stores (name, location_id, description, retour)
    VALUES ($1, $2, $3, $4)
      RETURNING *;
       `,
};
