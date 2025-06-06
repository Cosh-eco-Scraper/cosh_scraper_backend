export const statementQueries = {
  getAllStatements: () => `
    SELECT "statement" FROM statements;
    `,
  getStatementById: () => `
    SELECT "statement" FROM statements
    WHERE id = $1;
    `,
};
