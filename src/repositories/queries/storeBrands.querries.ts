
export const storeBrandsQueries = {
    updateStoreBrands: (storeId: number, brandId: number) =>
        `UPDATE store_brands
        SET brand_id = ${brandId}
        WHERE store_id = ${storeId};`,


};