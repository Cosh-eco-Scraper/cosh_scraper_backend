export const storeBrandsQueries = {
  addBrandToStore(storeId: number, brandId: number) {
    return `
      INSERT INTO store_brands (store_id, brand_id)
      VALUES (${storeId}, ${brandId})
    `;
  }
};
