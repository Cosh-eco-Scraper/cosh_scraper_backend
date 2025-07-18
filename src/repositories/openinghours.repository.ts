import databasePool from '../config/dbConnectionConfig';
import NotFoundError from '../domain/errors/NotFoundError';
import { OpeningHours } from '../domain/OpeningHours';
import { mapper } from './mapper';
import { openingHoursQueries } from './queries/openinghours.queries';

export const openingHoursRespository = {
  updateOpeningHours: async (
    openingHoursId?: number,
    day?: string,
    startTime?: string,
    endTime?: string,
    store_id?: number,
    openingAtAfterNoon?: string | null,
    closingAtAfterNoon?: string | null,
  ): Promise<number> => {
    // const result = await databasePool.query(
    //   openingHoursQueries.updateOpeningHours(openingHoursId, day, startTime, endTime, store_id),
    // );
    const query = openingHoursQueries.updateOpeningHours();
    const params = [
      day,
      startTime,
      endTime,
      openingAtAfterNoon,
      closingAtAfterNoon,
      store_id,
      openingHoursId,
    ];
    const result = await databasePool.query(query, params);

    if (!result.rowCount) {
      throw new NotFoundError('Opening hours not found');
    }
    return openingHoursId as number;
  },

  createOpeningHours: async (
    day: string,
    startTime: string,
    endTime: string,
    store_id: number,
    startTimeAn?: string | null,
    endTimeAn?: string | null,
  ): Promise<OpeningHours> => {
    const query = openingHoursQueries.createOpeningHours();
    const params = [day, startTime, endTime, startTimeAn, endTimeAn, store_id];
    const result = await databasePool.query(query, params);

    if (!result.rowCount) {
      throw new NotFoundError('Opening hours not found');
    }
    const opening_hours = result.rows.map(mapper.mapHour)[0] as unknown as OpeningHours;
    return opening_hours;
  },
};
