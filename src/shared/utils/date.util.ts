import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

const DEFAULT_TIMEZONE = 'Asia/Jakarta';

export const dateUtil = dayjs;

export const nowInJakarta = (): dayjs.Dayjs => {
    return dayjs().tz(DEFAULT_TIMEZONE);
};

export type DateType = dayjs.Dayjs | Date | string | number;
