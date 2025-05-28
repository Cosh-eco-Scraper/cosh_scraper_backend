import databasePool from '../config/dbConnectionConfig';
import { mapper } from './mapper';
import { statementQueries } from './queries/statement.querries';

export const statementRepository = {
  getAllStatements: async () => {
    const query = statementQueries.getAllStatements();
    const result = await databasePool.query(query);
    return result.rows.map(mapper.mapStatement);
  },
  getStatementById: async (id: number) => {
    const query = statementQueries.getStatementById();
    const params = [id];
    const result = await databasePool.query(query, params);
    if (result.rowCount === 0) {
      throw new Error(`Statement with id ${id} not found`);
    }
    return result.rows[0].statement;
  },
};
