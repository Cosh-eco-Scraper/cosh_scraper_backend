export const brandQueries = {
  updateBrand: () => `UPDATE brands 
                        SET name = $1,
                            label = $2
                        WHERE id = $3 RETURNING *;`,
  createBrand: () => `INSERT INTO brands (name, label)
                        VALUES ($1, $2)
                        RETURNING *;`,
  getAllBrands: () => `SELECT id, name, label FROM brands;`,

  getBrandbyName: () => `SELECT id, name, label FROM brands WHERE name = $1;`,
};
