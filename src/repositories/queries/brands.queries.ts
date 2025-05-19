export const brandQueries = {
    getBrandById: (id: number) => `SELECT *
                                    FROM brands
                                    WHERE id = ${id};`,
    getAllBrands: () => `SELECT *
                         FROM brands;`,
    getBrandByName: (name: string) => `SELECT *
                                       FROM brands
                                       WHERE name = '${name}';`,

    updateBrand: (brandId: number, name: string, label: string) => `UPDATE brands 
                                                    SET name = '${name}',
                                                        label = '${label}'
                                                    WHERE name = '${brandId}';`,

};