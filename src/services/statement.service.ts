import { statementRepository } from '../repositories/statement.repository';

const getAllStatements = async () => {
  const result = await statementRepository.getAllStatements();
  return result;
};

const getStatementById = async (id: number) => {
  const result = await statementRepository.getStatementById(id);
  return result;
};

const getRandomStatement = async () => {
  const statements = await getAllStatements();
  const randomIndex = Math.floor(Math.random() * statements.length);
  const randomStatement = statements[randomIndex];
  return randomStatement;
};

const StatementService = {
  getAllStatements,
  getStatementById,
  getRandomStatement,
};

export default StatementService;
