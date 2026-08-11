import { createFileRoute } from "@tanstack/react-router";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import logo from "@/assets/logo.png";
import hero from "@/assets/hero.jpeg";
import styleCornrowsBun from "@/assets/style-cornrows-bun.jpeg.asset.json";
import styleCornrowsGrid from "@/assets/style-cornrows-grid.jpeg.asset.json";
import styleFeedinBraids from "@/assets/style-feedin-braids.jpeg.asset.json";
import styleCrochetCurly from "@/assets/style-crochet-curly.jpeg.asset.json";
import styleKnotlessColour from "@/assets/style-knotless-colour.jpeg.asset.json";
import styleBoxBraids from "@/assets/style-box-braids.jpeg.asset.json";

const styleImages: Record<string, string> = {
  "cornrows-bun": styleCornrowsBun.url,
  "cornrows-grid": styleCornrowsGrid.url,
  "feedin-braids": styleFeedinBraids.url,
  "crochet-curly": styleCrochetCurly.url,
  "knotless-colour": styleKnotlessColour.url,
  "box-braids": styleBoxBraids.url,
  salon: hero,
};

import {
  translations,
  services,
  styleShowcase,
  type Lang,
} from "@/lib/i18n";

import PuntyAssistant from "@/components/PuntyAssistant";

import {
  businessConfig,
  formatOpeningHours,
  formatPrice,
  formatServicePrice,
  getOpeningWindow,
  pricingCopy,
  storageKey,
} from "@/lib/business";

import {
  createBooking,
  createWalkin,
  isSlotTakenError,
  listBookings,
  listReviews,
  staffForService,
  type CatalogueStaff,
  type ReviewUI,
} from "@/lib/data";



import { supabase } from "@/lib/supabase";
import { notifyBookingConfirmation } from "@/lib/email/notify";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${businessConfig.businessName} | ${businessConfig.tagline}` },
      { name: "description", content: businessConfig.description },
      { name: "author", content: businessConfig.businessName },

      {
        property: "og:title",
        content: `${businessConfig.businessName} | ${businessConfig.tagline}`,
      },
      { property: "og:description", content: businessConfig.description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: businessConfig.website },

      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: `${businessConfig.businessName} | ${businessConfig.tagline}`,
      },
      { name: "twitter:description", content: businessConfig.description },
    ],

    links: [
      { rel: "canonical", href: businessConfig.website },
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "stylesheet",
        href:
          "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700;800&display=swap",
      },
    ],
  }),

  component: Index,
});

function Index() {
  const [lang, setLang] = useState<Lang>("es");

  useEffect(() => {
    const stored = localStorage.getItem(
      storageKey("lang"),
    ) as Lang | null;

    if (stored === "es" || stored === "en") {
      setLang(stored);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(storageKey("lang"), lang);
  }, [lang]);

  const t = translations[lang];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header lang={lang} setLang={setLang} t={t} />

      <Hero t={t} />

      <Problem t={t} />

      <DataSection t={t} />

      <Solution t={t} />

      <Services t={t} lang={lang} />

      <StyleShowcase t={t} lang={lang} />

      <Reviews t={t} lang={lang} />

      <Booking t={t} lang={lang} />

      <Walkin t={t} />

      <Benefits t={t} />



      <Footer t={t} />

      <PuntyAssistant
        lang={lang}
        setLang={setLang}
      />
    </div>
  );
}

function Header({
  lang,
  setLang,
  t,
}: {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: any;
}) {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-lg bg-white/80 border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <a
          href="#top"
          className="flex items-center gap-3"
        >
          <img
            src={logo}
            alt={businessConfig.businessName}
            className="w-11 h-11 object-contain"
          />

          <div className="leading-tight">
            <div className="font-bold text-brand-blue text-lg">
              {businessConfig.businessName}
            </div>

            <div className="text-[10px] tracking-[0.2em] text-brand-gray uppercase">
              {t.brandTagline}
            </div>
          </div>
        </a>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          <a
            href="#services"
            className="hover:text-brand-red transition"
          >
            {t.nav.services}
          </a>

          <a
            href="#booking"
            className="hover:text-brand-red transition"
          >
            {t.nav.booking}
          </a>

          <a
            href="#walkin"
            className="hover:text-brand-red transition"
          >
            {t.nav.walkin}
          </a>

          <a
            href="#contact"
            className="hover:text-brand-red transition"
          >
            {t.nav.contact}
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-secondary rounded-full p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setLang("es")}
              className={`px-3 py-1 rounded-full transition ${
                lang === "es"
                  ? "bg-white text-brand-blue shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              ES
            </button>

            <button
              type="button"
              onClick={() => setLang("en")}
              className={`px-3 py-1 rounded-full transition ${
                lang === "en"
                  ? "bg-white text-brand-blue shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              EN
            </button>
          </div>

          <a
            href="#booking"
            className="hidden sm:inline-flex items-center bg-gradient-brand text-white px-5 py-2.5 rounded-full text-sm font-semibold shadow-soft hover:scale-105 transition"
          >
            {t.cta}
          </a>
        </div>
      </div>
    </header>
  );
}

function Hero({ t }: { t: any }) {
  return (
    <section
      id="top"
      className="relative overflow-hidden"
    >
      <div className="absolute inset-0">
        <img
          src={hero}
          alt={businessConfig.businessName}
          className="w-full h-full object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-r from-brand-black/85 via-brand-black/60 to-brand-black/30" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-28 md:py-40">
        <div className="max-w-2xl text-white animate-fade-up">
          <span className="inline-block px-3 py-1 bg-brand-red/90 rounded-full text-xs font-semibold tracking-wider mb-6">
            {businessConfig.city.toUpperCase()} · {businessConfig.postcode}
          </span>

          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-5">
            {t.hero.title}
          </h1>

          <p className="text-lg md:text-xl text-white/85 mb-8 max-w-xl">
            {t.hero.subtitle}
          </p>

          <div className="flex flex-wrap gap-3">
            <a
              href="#booking"
              className="bg-gradient-brand text-white px-7 py-3.5 rounded-full font-semibold shadow-soft hover:scale-105 transition"
            >
              {t.hero.book}
            </a>

            <a
              href="#solution"
              className="bg-white/10 backdrop-blur border border-white/30 text-white px-7 py-3.5 rounded-full font-semibold hover:bg-white/20 transition"
            >
              {t.hero.how}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Problem({ t }: { t: any }) {
  const icons = ["📈", "⏰", "💻", "😩"];

  return (
    <section className="py-20 md:py-28 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <SectionTitle
          title={t.problem.title}
          subtitle={t.problem.subtitle}
        />

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-12">
          {t.problem.items.map((it: any, i: number) => (
            <div
              key={i}
              className="bg-card rounded-2xl p-6 shadow-card hover:shadow-soft hover:-translate-y-1 transition"
            >
              <div className="text-4xl mb-4">{icons[i]}</div>

              <h3 className="font-bold text-lg mb-2 text-brand-blue">
                {it.t}
              </h3>

              <p className="text-sm text-muted-foreground">
                {it.d}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DataSection({ t }: { t: any }) {
  return (
    <section className="py-20 md:py-28 px-4 sm:px-6 bg-gradient-to-br from-secondary to-white">
      <div className="max-w-7xl mx-auto">
        <SectionTitle title={t.data.title} />

        <div className="grid md:grid-cols-2 gap-6 mt-12">
          <div className="bg-card rounded-3xl p-10 shadow-card">
            <div className="text-6xl md:text-7xl font-bold text-brand-red mb-2">
              -30%
            </div>

            <p className="text-muted-foreground">
              {t.data.lost}
            </p>

            <div className="mt-6 h-3 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-red rounded-full"
                style={{ width: "30%" }}
              />
            </div>
          </div>

          <div className="bg-card rounded-3xl p-10 shadow-card">
            <div className="text-6xl md:text-7xl font-bold text-brand-blue mb-2">
              £15,000
            </div>

            <p className="text-muted-foreground">
              {t.data.money}
            </p>

            <div className="mt-6 flex items-end gap-2 h-20">
              {[40, 65, 50, 80, 45, 90, 70].map(
                (h, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-gradient-to-t from-brand-blue to-brand-red rounded-t-lg"
                    style={{ height: `${h}%` }}
                  />
                ),
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Solution({ t }: { t: any }) {
  const icons = ["📅", "⚡", "✨"];

  return (
    <section
      id="solution"
      className="py-20 md:py-28 px-4 sm:px-6"
    >
      <div className="max-w-7xl mx-auto">
        <SectionTitle
          title={t.solution.title}
          subtitle={t.solution.subtitle}
        />

        <div className="grid md:grid-cols-3 gap-6 mt-12">
          {t.solution.steps.map((s: any, i: number) => (
            <div
              key={i}
              className="relative bg-card rounded-2xl p-8 shadow-card hover:shadow-soft transition"
            >
              <div className="absolute -top-5 left-8 w-10 h-10 rounded-full bg-gradient-brand text-white font-bold flex items-center justify-center shadow-soft">
                {i + 1}
              </div>

              <div className="text-5xl mb-4 mt-2">
                {icons[i]}
              </div>

              <h3 className="font-bold text-xl mb-2 text-brand-blue">
                {s.t}
              </h3>

              <p className="text-muted-foreground">
                {s.d}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Services({
  t,
  lang,
}: {
  t: any;
  lang: Lang;
}) {
  return (
    <section
      id="services"
      className="py-20 md:py-28 px-4 sm:px-6 bg-secondary/40"
    >
      <div className="max-w-7xl mx-auto">
        <SectionTitle
          title={t.services.title}
          subtitle={t.services.subtitle}
        />

        <div className="mt-10 rounded-3xl overflow-hidden shadow-card">
          <img
            src={hero}
            alt={businessConfig.businessName}
            loading="lazy"
            className="w-full h-56 md:h-80 object-cover"
          />
        </div>


        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
          {services.map((s) => (
            <div
              key={s.id}
              className="bg-card rounded-2xl p-6 shadow-card hover:shadow-soft hover:-translate-y-1 transition flex items-center gap-4"
            >
              <div className="text-4xl">{s.icon}</div>

              <div className="flex-1">
                <h3 className="font-semibold text-foreground">
                  {lang === "es"
                    ? s.name_es
                    : s.name_en}
                </h3>

                <p className="text-xs text-muted-foreground">
                  {pricingCopy[lang].durationVaries}
                </p>
              </div>

              <div className="text-brand-blue font-bold text-sm text-right">
                {formatServicePrice(s.price, lang)}
                <span className="block text-[11px] font-normal text-muted-foreground">
                  {pricingCopy[lang].cash}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StyleShowcase({
  t,
  lang,
}: {
  t: any;
  lang: Lang;
}) {
  return (
    <section
      id="styles"
      className="py-20 md:py-28 px-4 sm:px-6"
    >
      <div className="max-w-7xl mx-auto">
        <SectionTitle title={t.styles.title} subtitle={t.styles.subtitle} />

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          {styleShowcase.map((item) => (
            <article
              key={item.id}
              className="bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-soft hover:-translate-y-1 transition flex flex-col"
            >
              <div className="aspect-[4/3] w-full overflow-hidden bg-secondary">
                <img
                  src={styleImages[item.image]}
                  alt={lang === "es" ? item.alt_es : item.alt_en}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="p-6 flex flex-col flex-1">
                <h3 className="font-bold text-brand-blue text-lg mb-2">
                  {lang === "es" ? item.name_es : item.name_en}
                </h3>

                <p className="text-sm text-muted-foreground flex-1">
                  {lang === "es" ? item.desc_es : item.desc_en}
                </p>

                <span className="mt-4 inline-flex self-start rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                  {t.styles.comingSoon}
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Reviews({
  t,
  lang,
}: {
  t: any;
  lang: Lang;
}) {
  const [reviews, setReviews] = useState<ReviewUI[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const result = await listReviews();
        if (mounted) setReviews(result.data || []);
      } catch (err) {
        console.error("Failed to load reviews", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section id="reviews" className="py-20 md:py-28 px-4 sm:px-6 bg-secondary/30">
      <div className="max-w-6xl mx-auto">
        <SectionTitle
          title={t.reviews.title}
          subtitle={t.reviews.subtitle}
        />

        {loading ? (
          <div className="text-center mt-12 text-muted-foreground">
            {t.reviews.loading}
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center mt-12 text-muted-foreground">
            {t.reviews.empty}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
            {reviews.map((review) => (
              <div
                key={review.id || `${review.name}-${review.created_at}`}
                className="bg-card rounded-2xl p-6 shadow-card hover:shadow-soft hover:-translate-y-1 transition flex flex-col"
              >
                <div className="flex items-center gap-1 mb-3 text-yellow-500 text-lg">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i}>
                      {i < review.rating ? "★" : "☆"}
                    </span>
                  ))}
                </div>

                <p className="text-foreground text-sm leading-relaxed mb-4 flex-1">
                  “{review.comment}”
                </p>

                <div className="mt-auto">
                  <div className="font-bold text-brand-blue text-sm">
                    {review.name}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {review.role}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Booking({
  t,
  lang,
}: {
  t: any;
  lang: Lang;
}) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    service: services[0].id,
    barber: "any",
    date: "",
    time: "",
    comments: "",
  });

  const [confirmed, setConfirmed] =
    useState<any>(null);

  const [error, setError] = useState("");

  const [saving, setSaving] = useState(false);

  const [bookings, setBookings] = useState<any[]>(
    [],
  );

  const [loadingSlots, setLoadingSlots] =
    useState(false);

  const selected =
    services.find(
      (s) => s.id === form.service,
    ) || services[0];

  // Compatible professionals come from staff_services (no hardcoded UUIDs).
  const [currentProfessionals, setCurrentProfessionals] = useState<string[]>(
    [],
  );

  useEffect(() => {
    let alive = true;

    staffForService(selected.id)
      .then((staff: CatalogueStaff[]) => {
        if (!alive) return;
        const names = staff.map((s) => s.name);
        setCurrentProfessionals(names);
        setForm((current) =>
          current.barber !== "any" && !names.includes(current.barber)
            ? { ...current, barber: names.length === 1 ? names[0] : "any" }
            : names.length === 1 && current.barber === "any"
              ? { ...current, barber: names[0] }
              : current,
        );
      })
      .catch((err: unknown) => {
        console.error("[booking form] staff_services load failed", err);
        if (alive) setCurrentProfessionals([]);
      });

    return () => {
      alive = false;
    };
  }, [selected.id]);


  useEffect(() => {
    const loadBookings = async () => {
      if (!form.date) return;

      setLoadingSlots(true);

      try {
        const result = await listBookings();

        setBookings(result.data || []);
      } catch (err) {
        console.error(
          "Failed loading bookings",
          err,
        );
      } finally {
        setLoadingSlots(false);
      }
    };

    loadBookings();
  }, [form.date]);

  const update = (
    key: string,
    value: string,
  ) => {
    setError("");

    setForm((current) => {
      const next = {
        ...current,
        [key]: value,
      };

      if (key === "service") {
        // Compatible professionals are resolved from staff_services.
        next.barber = "any";
      }

      return next;
    });
  };

  const todayIso = () => {
    const d = new Date();

    return `${d.getFullYear()}-${String(
      d.getMonth() + 1,
    ).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;
  };

  const isValidUkMobile = (
    phone: string,
  ) => {
    const cleaned = phone.replace(
      /\s+/g,
      "",
    );

    return /^(07\d{9}|\+447\d{9}|447\d{9})$/.test(
      cleaned,
    );
  };

  const normalizeUkMobile = (
    phone: string,
  ) => {
    const cleaned = phone.replace(
      /\s+/g,
      "",
    );

    if (cleaned.startsWith("+44"))
      return cleaned;

    if (cleaned.startsWith("44"))
      return `+${cleaned}`;

    if (cleaned.startsWith("07"))
      return `+44${cleaned.slice(1)}`;

    return cleaned;
  };

  const isValidEmail = (
    email: string,
  ) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email.trim(),
    );
  };

  const getDayOfWeek = (
    date: string,
  ) => {
    const [year, month, day] = date
      .split("-")
      .map(Number);

    return new Date(
      year,
      month - 1,
      day,
    ).getDay();
  };

  const timeToMinutes = (
    time: string,
  ) => {
    const [h, m] = time
      .split(":")
      .map(Number);

    return h * 60 + m;
  };
const isActiveBooking = (status?: string) => {
    return status === "confirmed" || status === "pending";
  };

  const isValidOpeningTime = (
    date: string,
    time: string,
    duration: number,
  ) => {
    const window = getOpeningWindow(getDayOfWeek(date));

    if (!window) return false;

    const start = timeToMinutes(time);
    const end = start + duration;

    return start >= window.start && end <= window.end;
  };

  const bookingOverlaps = (
    booking: any,
    date: string,
    time: string,
    duration: number,
  ) => {
    if (!isActiveBooking(booking.status)) return false;
    if (booking.date !== date) return false;

    const existingTime = String(booking.time || "").slice(0, 5);

    if (!existingTime || !existingTime.includes(":")) {
      return false;
    }

    const existingStart = timeToMinutes(existingTime);
    const existingDuration = Number(booking.duration) || 30;
    const existingEnd = existingStart + existingDuration;

    const newStart = timeToMinutes(time);
    const newEnd = newStart + duration;

    return newStart < existingEnd && newEnd > existingStart;
  };

  const professionalIsBusy = (
    bookingList: any[],
    professionalName: string,
    date: string,
    time: string,
    duration: number,
  ) => {
    return bookingList.some((booking) => {
      if (!bookingOverlaps(booking, date, time, duration)) return false;

      return (
        String(booking.barber || "").toLowerCase() ===
        professionalName.toLowerCase()
      );
    });
  };

  const findAvailableProfessional = (
    bookingList: any[],
    date: string,
    time: string,
    duration: number,
  ) => {
    const available = currentProfessionals.filter(
      (professional) =>
        !professionalIsBusy(
          bookingList,
          professional,
          date,
          time,
          duration,
        ),
    );

    if (available.length === 0) return null;

    const workload = available.map((professional) => {
      const count = bookingList.filter(
        (booking) =>
          isActiveBooking(booking.status) &&
          booking.date === date &&
          String(booking.barber || "").toLowerCase() ===
            professional.toLowerCase(),
      ).length;

      return {
        professional,
        count,
      };
    });

    workload.sort((a, b) => {
      if (a.count !== b.count) return a.count - b.count;

      return (
        currentProfessionals.indexOf(a.professional) -
        currentProfessionals.indexOf(b.professional)
      );
    });

    return workload[0].professional;
  };

  const generateTimeSlots = () => {
    const slots: string[] = [];

    if (!form.date) return slots;

    const window = getOpeningWindow(getDayOfWeek(form.date));

    if (!window) return slots;

    const step = businessConfig.slotIntervalMinutes;

    for (let minutes = window.start; minutes < window.end; minutes += step) {
      const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
      const mm = String(minutes % 60).padStart(2, "0");
      const slot = `${hh}:${mm}`;

      if (isValidOpeningTime(form.date, slot, selected.duration)) {
        slots.push(slot);
      }
    }

    return slots;
  };

  const availableSlots = generateTimeSlots().filter((slot) => {
    if (!form.date) return false;

    if (form.barber === "any") {
      return currentProfessionals.some(
        (professional) =>
          !professionalIsBusy(
            bookings,
            professional,
            form.date,
            slot,
            selected.duration,
          ),
      );
    }

    return !professionalIsBusy(
      bookings,
      form.barber,
      form.date,
      slot,
      selected.duration,
    );
  });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (saving) return;

    if (!isValidUkMobile(form.phone)) {
      setError(t.booking.invalidPhone);
      return;
    }

    if (!isValidEmail(form.email)) {
      setError(t.booking.invalidEmail);
      return;
    }

    if (!form.date || form.date < todayIso()) {
      setError(t.booking.pastDate);
      return;
    }

    if (
      !form.time ||
      !isValidOpeningTime(form.date, form.time, selected.duration)
    ) {
      setError(
        t.booking.outsideHours.replace("{h}", formatOpeningHours(1)),
      );
      return;
    }

    setSaving(true);

    try {
      // The database is the final authority: "any" is resolved server-side
      // and the professional/price/duration come back from create_booking.
      const booking = {
        name: form.name.trim(),
        phone: normalizeUkMobile(form.phone),
        email: form.email.trim().toLowerCase(),
        service: selected.id,
        barber: form.barber,
        date: form.date,
        time: form.time,
        comments: form.comments || "",
        price: selected.price,
        duration: selected.duration,
        createdAt: Date.now(),
        status: "confirmed" as const,
      };

      const saved = await createBooking(booking);
      const finalProfessional = saved.barber || form.barber;

      // Emails (client + business) are sent server-side and are idempotent.
      await notifyBookingConfirmation(saved.id, lang);


      setConfirmed({
        ...booking,
        ...saved,
        barber: finalProfessional,
        serviceLabel: lang === "es" ? selected.name_es : selected.name_en,
      });

      setBookings((current) => [...current, { ...booking, ...saved }]);

      setForm({
        name: "",
        phone: "",
        email: "",
        service: services[0].id,
        barber: "any",
        date: "",
        time: "",
        comments: "",
      });
    } catch (err) {
      console.error("[booking form] save failed", err);

      if (isSlotTakenError(err)) {
        setError(t.booking.slotTaken);

        try {
          const refreshed = await listBookings();
          setBookings(refreshed.data || []);
        } catch (refreshError) {
          console.warn("[booking form] availability refresh failed", refreshError);
        }
      } else {
        setError(t.booking.saveError);
      }
    } finally {

      setSaving(false);
    }
  };
  return (
    <section id="booking" className="py-20 md:py-28 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <SectionTitle title={t.booking.title} subtitle={t.booking.subtitle} />

        <form
          onSubmit={submit}
          className="bg-card rounded-3xl p-6 md:p-10 shadow-soft mt-12 grid md:grid-cols-2 gap-5"
        >
          <Field label={t.booking.name}>
            <input
              required
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              className={inputCls}
            />
          </Field>

          <Field label={t.booking.phone}>
            <input
              required
              type="tel"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              className={inputCls}
              placeholder="07788998899"
            />
          </Field>

          <Field label={t.booking.email} className="md:col-span-2">
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className={inputCls}
            />
          </Field>

          <Field label={t.booking.service}>
            <select
              value={form.service}
              onChange={(e) => update("service", e.target.value)}
              className={inputCls}
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {lang === "es" ? s.name_es : s.name_en}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t.booking.barber}>
            <select
              value={form.barber}
              onChange={(e) => update("barber", e.target.value)}
              className={inputCls}
            >
              {currentProfessionals.length > 1 && (
                <option value="any">{t.booking.any}</option>
              )}
              {currentProfessionals.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t.booking.date}>
            <input
              required
              type="date"
              min={todayIso()}
              value={form.date}
              onChange={(e) => update("date", e.target.value)}
              className={inputCls}
            />
          </Field>

          <Field label={t.booking.time}>
            <select
              required
              value={form.time}
              onChange={(e) => update("time", e.target.value)}
              className={inputCls}
              disabled={!form.date || loadingSlots}
            >
              <option value="">
                {loadingSlots
                  ? t.booking.loadingTimes
                  : form.date
                    ? t.booking.selectTime
                    : t.booking.chooseDateFirst}
              </option>

              {availableSlots.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t.booking.comments} className="md:col-span-2">
            <textarea
              rows={3}
              value={form.comments}
              onChange={(e) => update("comments", e.target.value)}
              className={inputCls}
            />
          </Field>

          {error && (
            <div className="md:col-span-2 rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm font-semibold">
              {error}
            </div>
          )}

          <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-4 p-4 bg-secondary/50 rounded-xl">
            <div className="flex gap-6 text-sm">
              <div>
                <span className="text-muted-foreground">
                  {t.booking.price}:{" "}
                </span>
                <span className="font-bold text-brand-blue">
                  {formatServicePrice(selected.price, lang)}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground">
                  {t.booking.duration}:{" "}
                </span>
                <span className="font-bold text-brand-blue">
                  {pricingCopy[lang].durationVaries}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving || loadingSlots}
              className="bg-gradient-brand text-white px-8 py-3 rounded-full font-semibold shadow-soft hover:scale-105 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? t.booking.saving : t.booking.submit}
            </button>
          </div>
        </form>
      </div>

      {confirmed && (
        <div
          className="fixed inset-0 z-50 bg-brand-black/70 backdrop-blur flex items-center justify-center p-4 animate-fade-up"
          onClick={() => setConfirmed(null)}
        >
          <div
            className="bg-card rounded-3xl p-8 max-w-md w-full text-center shadow-soft"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={logo}
              alt={businessConfig.businessName}
              className="w-20 h-20 object-contain mx-auto mb-4"
            />

            <div className="text-5xl mb-3">✅</div>

            <h3 className="text-2xl font-bold text-brand-blue mb-2">
              {t.booking.success}
            </h3>

            <p className="text-muted-foreground mb-4">
              {t.booking.successDesc}
            </p>

            <div className="text-left bg-secondary/50 rounded-xl p-4 text-sm space-y-1">
              <div>
                <b>{confirmed.name}</b>
              </div>

              <div>
                {confirmed.date} · {confirmed.time}
              </div>

              <div>
                {confirmed.serviceLabel || confirmed.service} —{" "}
                {confirmed.pricePending
                  ? pricingCopy[lang].onConsultation
                  : formatServicePrice(
                      confirmed.agreedPrice ?? confirmed.price,
                      lang,
                    )}
              </div>


              <div className="text-muted-foreground">
                {confirmed.barber}
              </div>
            </div>

            <button
              onClick={() => setConfirmed(null)}
              className="mt-6 bg-brand-blue text-white px-6 py-2.5 rounded-full font-semibold"
            >
              {t.booking.close}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
const inputCls =
  "w-full px-4 py-3 rounded-xl bg-secondary/60 border border-transparent focus:border-brand-blue focus:bg-white focus:outline-none transition text-sm";

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
        {label}
      </span>
      {children}
    </label>
  );
}

function Walkin({ t }: { t: any }) {
  const [queue, setQueue] = useState<{ id: number; ts: number }[]>([]);
  const [myId, setMyId] = useState<number | null>(null);

  useEffect(() => {
    const q = JSON.parse(localStorage.getItem(storageKey("queue")) || "[]");
    const filtered = q.filter(
      (p: any) => Date.now() - p.ts < 4 * 60 * 60 * 1000,
    );

    setQueue(filtered);

    const m = localStorage.getItem(storageKey("myqueue"));
    if (m) setMyId(Number(m));
  }, []);

  const join = async () => {
    const id = Date.now();
    const next = [...queue, { id, ts: id }];

    setQueue(next);
    setMyId(id);

    localStorage.setItem(storageKey("queue"), JSON.stringify(next));
    localStorage.setItem(storageKey("myqueue"), String(id));

    await createWalkin(`Walk-in ${id}`);
  };

  const position = useMemo(
    () => (myId ? queue.findIndex((p) => p.id === myId) + 1 : 0),
    [queue, myId],
  );

  const wait = queue.length * 25;

  return (
    <section
      id="walkin"
      className="py-20 md:py-28 px-4 sm:px-6 bg-gradient-to-br from-brand-blue to-brand-black text-white"
    >
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-bold mb-3">
            {t.walkin.title}
          </h2>
          <p className="text-white/70 max-w-2xl mx-auto">
            {t.walkin.subtitle}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          <div className="bg-white/10 backdrop-blur rounded-2xl p-8 text-center border border-white/10">
            <div className="text-6xl font-bold mb-2">{queue.length}</div>
            <div className="text-white/70 text-sm">{t.walkin.people}</div>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-2xl p-8 text-center border border-white/10">
            <div className="text-6xl font-bold mb-2">
              ~{wait}
              <span className="text-2xl">m</span>
            </div>
            <div className="text-white/70 text-sm">{t.walkin.wait}</div>
          </div>

          <div className="bg-gradient-brand rounded-2xl p-8 text-center flex flex-col justify-center shadow-soft">
            {myId && position > 0 ? (
              <>
                <div className="text-sm text-white/80 mb-1">
                  {t.walkin.joined}
                </div>
                <div className="text-5xl font-bold">#{position}</div>
                <div className="text-xs text-white/80 mt-1">
                  {t.walkin.position}
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={join}
                className="bg-white text-brand-blue font-bold py-4 rounded-xl hover:scale-105 transition"
              >
                {t.walkin.join}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Benefits({ t }: { t: any }) {
  const icons = ["⚡", "🎯", "💎", "🚀"];

  return (
    <section className="py-20 md:py-28 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <SectionTitle title={t.benefits.title} />

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-12">
          {t.benefits.items.map((b: any, i: number) => (
            <div
              key={i}
              className="bg-card rounded-2xl p-6 shadow-card hover:shadow-soft hover:-translate-y-1 transition text-center"
            >
              <div className="text-4xl mb-3">{icons[i]}</div>
              <h3 className="font-bold text-brand-blue mb-2">{b.t}</h3>
              <p className="text-sm text-muted-foreground">{b.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer({ t }: { t: any }) {
  return (
    <footer id="contact" className="bg-brand-black text-white px-4 sm:px-6 py-16">
      <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-10">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <img
              src={logo}
              alt={businessConfig.businessName}
              className="w-12 h-12 object-contain"
            />

            <div>
              <div className="font-bold text-lg">
                {businessConfig.businessName}
              </div>
              <div className="text-[10px] tracking-[0.2em] text-white/60 uppercase">
                {t.brandTagline}
              </div>
            </div>
          </div>

          <p className="text-sm text-white/60 max-w-xs">
            {t.footer.description}
          </p>
        </div>

        <div>
          <h4 className="font-bold mb-3 text-brand-red">{t.footer.address}</h4>
          <p className="text-sm text-white/70 leading-relaxed">
            {businessConfig.address}
            <br />
            {businessConfig.city}, {businessConfig.postcode}
            <br />
            {businessConfig.country}
          </p>
        </div>

        <div>
          <h4 className="font-bold mb-3 text-brand-red">{t.footer.hours}</h4>
          <p className="text-sm text-white/70 leading-relaxed">
            {t.footer.weekdays}: {formatOpeningHours(1)}
            <br />
            {t.footer.sunday}: {formatOpeningHours(0)}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-12 pt-6 border-t border-white/10 text-xs text-white/50 text-center">
        ©️ {new Date().getFullYear()} {businessConfig.businessName}.{" "}
        {t.footer.rights}
      </div>
    </footer>
  );
}

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="text-center max-w-2xl mx-auto">
      <h2 className="text-3xl md:text-5xl font-bold text-brand-blue mb-3">
        {title}
      </h2>

      {subtitle && <p className="text-muted-foreground text-lg">{subtitle}</p>}
    </div>
  );
}
