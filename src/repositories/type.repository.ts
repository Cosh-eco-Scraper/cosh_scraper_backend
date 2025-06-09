import databasePool from '../config/dbConnectionConfig';

export const TypeRepository = {
  async findOrCreateType(typeName: string, description?: string) {
    const findQuery = 'SELECT * FROM types WHERE name = $1';
    const findResult = await databasePool.query(findQuery, [typeName]);
    if (findResult.rows.length > 0) {
      return findResult.rows[0];
    }
    const insertQuery = 'INSERT INTO types (name, description) VALUES ($1, $2) RETURNING *';
    const insertResult = await databasePool.query(insertQuery, [typeName, description || null]);
    return insertResult.rows[0];
  },

  async addTypeToStore(storeId: number, typeId: number) {
    const checkQuery = 'SELECT 1 FROM store_types WHERE store_id = $1 AND type_id = $2';
    const checkResult = await databasePool.query(checkQuery, [storeId, typeId]);
    if (checkResult.rows.length > 0) return;
    const insertQuery = 'INSERT INTO store_types (store_id, type_id) VALUES ($1, $2)';
    await databasePool.query(insertQuery, [storeId, typeId]);
  },
};
