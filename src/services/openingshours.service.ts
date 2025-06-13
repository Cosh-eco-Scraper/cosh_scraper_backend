import { OpeningHours } from '../domain/OpeningHours';
import { openingHoursRespository } from '../repositories/openinghours.repository';

const updateOpeningHours = async (
  openingHoursId?: number,
  day?: string,
  startTime?: string,
  endTime?: string,
  openingAtAfterNoon?: string | null,
  closingAtAfterNoon?: string | null,
  store_id?: number,
): Promise<number> => {
  const result = await openingHoursRespository.updateOpeningHours(
    openingHoursId,
    day,
    startTime,
    endTime,
    store_id,
    openingAtAfterNoon,
    closingAtAfterNoon,
  );
  return result;
};

const createOpeningHours = async (
  day: string,
  startTime: string,
  endTime: string,
  store_id: number,
  startTimeAn?: string | null,
  endTimeAn?: string | null,
): Promise<OpeningHours> => {
  const result = await openingHoursRespository.createOpeningHours(
    day,
    startTime,
    endTime,
    store_id,
    startTimeAn,
    endTimeAn,
  );
  return result;
};

const OpeningHoursService = {
  updateOpeningHours,
  createOpeningHours,
};

export default OpeningHoursService;
