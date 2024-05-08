import type { CityConfiguration, I18nCalendar } from "../types.ts";

const i18n: I18nCalendar = {
  en: {
    name: ({ name }: CityConfiguration): string => `${name} Garbage Calendar`,
  },
  nl: {
    name: ({ name }: CityConfiguration): string => `${name} afvalkalender`,
  },
};

export default i18n;
