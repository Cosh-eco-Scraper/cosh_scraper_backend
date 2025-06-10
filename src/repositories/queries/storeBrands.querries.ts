export const storeBrandsQueries = {
  addBrandToStore() {
    return `
      INSERT INTO store_brands (store_id, brand_id)
      VALUES ($1, $2)
    `;
  },
};
