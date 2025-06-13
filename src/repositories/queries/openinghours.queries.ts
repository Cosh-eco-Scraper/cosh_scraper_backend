export const openingHoursQueries = {
  updateOpeningHours: () => `
    UPDATE opening_hours
    SET day = $1,
        openingat = $2,
        closingat = $3,
        openingatafternoon = $4,
        closingatafternoon = $5,
        store_id = $6
    WHERE id = $7;
  `,

  createOpeningHours: () => `
    INSERT INTO opening_hours (day, openingat, closingat,openingAtAfterNoon,closingAtAfterNoon, store_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `,
};
