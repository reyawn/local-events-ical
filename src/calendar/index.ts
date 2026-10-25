import ical, {
  ICalCalendar,
  ICalCalendarMethod,
} from "ical-generator";
import type {
  CityConfiguration,
  EveryPickupEventType,
  LocalizedPickupEvent,
  SupportedLocale,
} from "../types.ts";
import i18n from "./i18n.ts";

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

export const createCalendar = (
  configuration: CityConfiguration,
  { locale, ttl }: { locale: SupportedLocale; ttl: number },
): ICalCalendar => {
  const calendar = ical({
    name: i18n[locale].name(configuration),
    timezone: "Europe/Amsterdam",
    ttl,
  });

  calendar.method(ICalCalendarMethod.REQUEST);

  return calendar;
};
