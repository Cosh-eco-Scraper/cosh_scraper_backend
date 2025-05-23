export const brandQueries = {
  updateBrand: (brandId?: number, name?: string, label?: string) => `UPDATE brands 
                                                    SET name = '${name}',
                                                        label = '${label}'
                                                    WHERE id = '${brandId}';`,
  createBrand: (name: string, label: string) => `INSERT INTO brands (name, label)
                                                    VALUES ('${name}', '${label}');`,
};
