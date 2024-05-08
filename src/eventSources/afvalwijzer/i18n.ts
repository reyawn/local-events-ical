import type { I18nEventSource, I18nEventSourceLocale } from "../../types.ts";
import { PickupEventType } from "./types.ts";

const en: I18nEventSourceLocale<PickupEventType> = {
  pickupEventByType: {
    [PickupEventType.Restafval]: {
      title: "Garbage",
    },
    [PickupEventType.Gft]: {
      title: "Compostable waste",
    },
    [PickupEventType.Pmd]: {
      title: "Plastic, Metal and Drink cartons",
    },
  },
};

const nl: I18nEventSourceLocale<PickupEventType> = {
  pickupEventByType: {
    [PickupEventType.Restafval]: {
      title: "Restafval",
    },
    [PickupEventType.Gft]: {
      title: "Groente, Fruit en Tuinafval",
    },
    [PickupEventType.Pmd]: {
      title: "Plastic, Metalen en Drankkartons",
    },
  },
};

const i18n: I18nEventSource<PickupEventType> = {
  en,
  nl,
};

export default i18n;
