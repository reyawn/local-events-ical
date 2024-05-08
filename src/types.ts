import {
  PickupEventType as AfvalwijzerPickupEventType,
} from "./eventSources/afvalwijzer/types.ts";

export interface Address {
  houseNumber: number;
  postCode: string;
}

export type EveryPickupEventType = AfvalwijzerPickupEventType;

export interface PickupEvent<
  PickupEventType extends EveryPickupEventType,
> {
  date: Date;
  type: PickupEventType;
}

export interface LocalizedPickupEvent<
  PickupEventType extends EveryPickupEventType,
> extends PickupEvent<PickupEventType> {
  localized: I8nPickupEvent;
}

export interface FetchPickupEventsOptions {
  locale: SupportedLocale;
}

type FetchLocalizedPickupEvents<
  PickupEventType extends EveryPickupEventType,
> = (
  address: Address,
  year: string,
  options: FetchPickupEventsOptions,
) => Promise<Array<LocalizedPickupEvent<PickupEventType>>>;

export interface EventSource<
  PickupEventType extends EveryPickupEventType = EveryPickupEventType,
> {
  name: string;
  fetchLocalizedPickupEvents: FetchLocalizedPickupEvents<PickupEventType>;
}

// From and to are 4 digit unsigned integers and the range is inclusive.
type PostCodePrefixRange = [from: number, to: number];

export enum SupportedLocale {
  "en" = "en",
  "nl" = "nl",
}

export interface CityConfiguration {
  eventSources: EventSource[];
  name: string;
  postCodes: Array<PostCodePrefixRange | number>;
}

interface I8nPickupEvent {
  description?: string;
  title: string;
}

export interface I18nEventSourceLocale<
  PickupEventType extends EveryPickupEventType,
> {
  pickupEventByType: {
    [key in PickupEventType]: I8nPickupEvent;
  };
}

export type I18nEventSource<PickupEventType extends EveryPickupEventType> = {
  [Locale in SupportedLocale]: I18nEventSourceLocale<PickupEventType>;
};

export type I18nCalendar = {
  [Locale in SupportedLocale]: {
    name: (configuration: CityConfiguration) => string;
  };
};
