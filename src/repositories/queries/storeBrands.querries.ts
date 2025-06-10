export const storeBrandsQueries = {
  addBrandToStore() {
    return `
      INSERT INTO store_brands (store_id, brand_id)
      VALUES ($1, $2)
    `;
  },
  removeBrandFromStore() {
    return `
      DELETE FROM store_brands
      WHERE store_id = $1 AND brand_id = $2
    `;
  },
};
