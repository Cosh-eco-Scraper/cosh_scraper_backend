export const brandQueries = {
  updateBrand: (brandId?: number, name?: string, label?: string) => `UPDATE brands 
                                                    SET name = '${name}',
                                                        label = '${label}'
                                                    WHERE id = '${brandId}';`,
};
