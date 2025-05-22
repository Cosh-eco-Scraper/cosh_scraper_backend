export const openingHoursQueries = {
  updateOpeningHours: (
    openingHoursId?: number,
    day?: string,
    startTime?: string,
    endTime?: string,
    storeId?: number,
  ) => `UPDATE opening_hours
                                                    SET day = '${day}',
                                                        openingat = '${startTime}',
                                                        closingat = '${endTime}',
                                                        store_id = '${storeId}'
                                                    WHERE id = '${openingHoursId}';`,
};
