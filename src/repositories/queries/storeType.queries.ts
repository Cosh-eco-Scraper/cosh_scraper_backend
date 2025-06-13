export const storeTypeQueries = {
  addStoreType: () => `INSERT INTO store_types (type_id, store_id)
                       SELECT $1, $2
                       WHERE NOT EXISTS (SELECT 1
                                         FROM store_types
                                         WHERE type_id = $1
                                           AND store_id = $2)`,
  removeStoreType: () => `DELETE FROM store_types 
                         WHERE type_id = $1
                         AND store_id = $2`,
};
