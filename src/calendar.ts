import ical, {
  ICalCalendar,
  ICalCalendarData,
  ICalCalendarMethod,
} from "npm:ical-generator@7.0.0";
import { CALENDAR_TTL } from "./config.ts";
import { EveryPickupEventType, LocalizedPickupEvent } from "./types.ts";

export const addLocalizedPickupEventsToCalendar = <
  PickupEventType extends EveryPickupEventType,
>(
  localizedPickupEvents: LocalizedPickupEvent<PickupEventType>[],
  calendar: ICalCalendar,
): ICalCalendar => {
  localizedPickupEvents.forEach(({ date, localized: { title } }) => {
    calendar.createEvent({
      allDay: true,
      start: date,
      summary: title,
    });
  });

  return calendar;
};

export const createCalendar = ({
  description,
  name,
}: Pick<ICalCalendarData, "name" | "description">): ICalCalendar => {
  const calendar = ical({
    ...(description === undefined ? undefined : { description }),
    name,
    timezone: "Europe/Amsterdam",
    ttl: CALENDAR_TTL,
  });

  calendar.method(ICalCalendarMethod.REQUEST);

  return calendar;
};
