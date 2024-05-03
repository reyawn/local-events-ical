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
  locale: I18nSupportedLocale;
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

export interface CityConfiguration {
  eventSources: EventSource[];
  name: string;
  postCodes: Array<PostCodePrefixRange | number>;
}

interface I8nPickupEvent {
  description?: string;
  title: string;
}

export interface I18nLocale<PickupEventType extends EveryPickupEventType> {
  pickupEventByType: {
    [key in PickupEventType]: I8nPickupEvent;
  };
}

export interface I18n<PickupEventType extends EveryPickupEventType> {
  en: I18nLocale<PickupEventType>;
  nl: I18nLocale<PickupEventType>;
}

export type I18nSupportedLocale = keyof I18n<EveryPickupEventType>;
