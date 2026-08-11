// Central configuration for the salon.
// Single source of truth for identity, contact data, SEO and opening hours.
// Do NOT re-hardcode any of these values inside components.

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday

export type OpeningHours = {
  /** Opening time "HH:MM" */
  open: string;
  /** Closing time "HH:MM" */
  close: string;
  /** When true the business is closed that day */
  closed?: boolean;
};

export type BusinessConfig = {
  businessId: string;
  businessName: string;
  legalName?: string;
  shortName: string;
  tagline: string;
  description: string;
  city: string;
  postcode: string;
  address: string;
  phone: string;
  email: string;
  whatsapp: string;
  instagram: string;
  website: string;
  locale: string;
  currency: string;
  currencySymbol: string;
  timezone: string;
  slotIntervalMinutes: number;
  openingHours: Record<DayOfWeek, OpeningHours>;
  logo: string;
  favicon: string;
  ogImage: string;
  assistantName: string;
  /** Prefix used for every localStorage key of this app */
  storagePrefix: string;
};

export const businessConfig: BusinessConfig = {
  // Stable UUID identifying this salon in the new Supabase project.
  businessId: "7c8f0987-88d1-4a87-87a6-68db1573b5b6",


  businessName: "Brightobarber",
  legalName: "NOMBRE DEL SALÓN LTD",
  shortName: "SALÓN",
  tagline: "Peluquería & Belleza",
  description:
    "Peluquería y centro de belleza. Reserva online tu cita de peluquería, color o belleza en segundos.",

  city: "London",
  postcode: "SE15 1JB",
  address: "624 Old Kent Road",


  phone: "+00 000 000 000",
  email: "hola@example.com",
  whatsapp: "+00 000 000 000",
  instagram: "https://instagram.com/",
  website: "https://example.com",

  locale: "es",
  currency: "GBP",
  currencySymbol: "£",
  timezone: "Europe/London",

  slotIntervalMinutes: 30,

  openingHours: {
    0: { open: "10:00", close: "22:00" },
    1: { open: "10:00", close: "22:00" },
    2: { open: "10:00", close: "22:00" },
    3: { open: "10:00", close: "22:00" },
    4: { open: "10:00", close: "22:00" },
    5: { open: "10:00", close: "22:00" },
    6: { open: "10:00", close: "22:00" },
  },

  logo: "/favicon.png",
  favicon: "/favicon.png",
  ogImage: "/project-preview.png",

  assistantName: "Asistente del salón",

  storagePrefix: "salon_",
};

/** Central prefix for every localStorage key used by the app. */
export const STORAGE_PREFIX = businessConfig.storagePrefix;

/** Build a namespaced localStorage key. */
export function storageKey(name: string): string {
  return `${STORAGE_PREFIX}${name}`;
}

/** Opening hours for a given JS day index (0 = Sunday). */
export function getOpeningHours(day: number): OpeningHours {
  return businessConfig.openingHours[(day % 7) as DayOfWeek];
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** Opening window in minutes from midnight, or null when closed. */
export function getOpeningWindow(
  day: number,
): { start: number; end: number } | null {
  const hours = getOpeningHours(day);
  if (!hours || hours.closed) return null;

  return {
    start: timeToMinutes(hours.open),
    end: timeToMinutes(hours.close),
  };
}

/** Human readable opening hours line, e.g. "09:00–19:00". */
export function formatOpeningHours(day: number): string {
  const hours = getOpeningHours(day);
  if (!hours || hours.closed) return "—";
  return `${hours.open}–${hours.close}`;
}

export function formatPrice(value: number | string): string {
  return `${businessConfig.currencySymbol}${value}`;
}
