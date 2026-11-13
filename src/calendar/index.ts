import ical, {
  ICalCalendar,
  ICalCalendarMethod,
} from "ical-generator";
import type {
  Address,
  CityConfiguration,
  EveryPickupEventType,
  LocalizedPickupEvent,
  SupportedLocale,
} from "../types.ts";
import i18n from "./i18n.ts";

const UID_HOST = "local-events-ical";

const hex = (buffer: ArrayBuffer): string =>
  [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

const pickupEventUid = async (
  sourceName: string,
  address: Address,
  date: Date,
  type: string,
): Promise<string> => {
  const identity = [
    sourceName,
    address.postCode,
    address.houseNumber.toString(10),
    date.toISOString().slice(0, 10),
    type,
  ].join("\n");
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(identity),
  );
  return `${hex(digest)}@${UID_HOST}`;
};

export const addLocalizedPickupEventsToCalendar = async <
  PickupEventType extends EveryPickupEventType,
>(
  localizedPickupEvents: LocalizedPickupEvent<PickupEventType>[],
  calendar: ICalCalendar,
  sourceName: string,
  address: Address,
): Promise<ICalCalendar> => {
  for (const { date, type, localized: { title } } of localizedPickupEvents) {
    calendar.createEvent({
      id: await pickupEventUid(sourceName, address, date, type),
      allDay: true,
      start: date,
      summary: title,
    });
  }

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

  calendar.method(ICalCalendarMethod.PUBLISH);

  return calendar;
};
