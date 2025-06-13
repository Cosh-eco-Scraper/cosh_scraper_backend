export const typeQueries = {
  getAllTypes: () => `SELECT id, name
                      FROM types;`,
  getType: () => `SELECT id, name
                  FROM types
                  WHERE id = $1;`,
};
