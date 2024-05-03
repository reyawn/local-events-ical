import type { I18n, I18nLocale } from "../../types.ts";
import { PickupEventType } from "./types.ts";

const en: I18nLocale<PickupEventType> = {
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

const nl: I18nLocale<PickupEventType> = {
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

const i18n: I18n<PickupEventType> = {
  en,
  nl,
};

export default i18n;
