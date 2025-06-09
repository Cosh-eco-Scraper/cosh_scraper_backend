import { OpeningHours } from '../domain/OpeningHours';
import { openingHoursRespository } from '../repositories/openinghours.repository';

const updateOpeningHours = async (
  openingHoursId?: number,
  day?: string,
  startTime?: string,
  endTime?: string,
  store_id?: number,
): Promise<number> => {
  const result = await openingHoursRespository.updateOpeningHours(
    openingHoursId,
    day,
    startTime,
    endTime,
    store_id,
  );
  return result;
};

const createOpeningHours = async (
  day: string,
  startTime: string,
  endTime: string,
  startTimeAn: string,
  endTimeAn: string,
  store_id: number,
): Promise<OpeningHours> => {
  const result = await openingHoursRespository.createOpeningHours(
    day,
    startTime,
    endTime,
    startTimeAn,
    endTimeAn,
    store_id,
  );
  return result;
};

const OpeningHoursService = {
  updateOpeningHours,
  createOpeningHours,
};

export default OpeningHoursService;
