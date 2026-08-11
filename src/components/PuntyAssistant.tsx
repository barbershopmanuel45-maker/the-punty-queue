import { useEffect, useRef, useState } from "react";
import logo from "@/assets/logo.png";
import { services, type Lang } from "@/lib/i18n";
import {
  businessConfig,
  formatOpeningHours,
  formatServicePrice,
  getOpeningWindow,
  pricingCopy,
} from "@/lib/business";
import {
  createBooking,
  createWalkin,
  isSlotTakenError,
  listBookings,
  loadCatalogue,
  requestConsultation,
} from "@/lib/data";


type Msg = {
  role: "bot" | "user";
  text: string;
  quick?: string[];
};

type Step =
  | { name: "idle" }
  | {
      name: "book";
      field:
        | "name"
        | "phone"
        | "email"
        | "service"
        | "barber"
        | "date"
        | "time";
      data: any;
    }
  | { name: "walkin_name" }
  | {
      name: "consult";
      field:
        | "service"
        | "date"
        | "time"
        | "alt"
        | "quote"
        | "budget"
        | "name"
        | "phone"
        | "email"
        | "notes";
      data: any;
    };

const T = {
  es: {
    title: businessConfig.assistantName,
    online: "En línea",
    placeholder: "Escribe un mensaje...",
    initial: `Hola, soy el asistente de ${businessConfig.businessName}. ¿En qué puedo ayudarte?`,
    quick: ["Reservar", "Consultar precio y horario", "Cancelar", "Walk-in"],
    menu: "Puedo ayudarte con: reservar, cancelar o entrar en walk-in.",
    askName: "Perfecto. ¿Cuál es tu nombre?",
    askPhone: "Gracias {n}. ¿Tu teléfono móvil UK?",
    askEmail: "Perfecto. ¿Tu email?",
    askService: "¿Qué servicio quieres?\n\n{list}\n\nResponde con el número.",
    askBarber: "¿Con quién quieres reservar?\n\n{list}\n\nResponde con el número.",
    askDate: "¿Qué fecha? (formato YYYY-MM-DD)",
    askTime: `¿A qué hora? (HH:MM)\n\nLun-Sáb: ${formatOpeningHours(
      1,
    )}\nDomingo: solo con reserva ${formatOpeningHours(0)}`,
    confirm:
      "✅ ¡Reserva confirmada!\n\n{n} — {s}\n📅 {d} a las {t}\n💈 Profesional: {b}\n📧 {e}\n💷 {c}{p}",
    cancelInfo:
      `Para cancelar o modificar una reserva, contacta directamente con ${businessConfig.businessName}.`,
    walkinAsk: "¿Tu nombre para la cola?",
    walkinJoined: "✅ ¡Estás en la cola! Espera estimada ~{w} min.",
    servicesList: "Nuestros servicios:\n\n{list}",
    bye: "No entendí 🤔. Prueba: reservar, cancelar, walk-in o servicios.",
    invalid: "Opción no válida. Intenta de nuevo.",
    invalidPhone: "Introduce un móvil UK válido. Ejemplo: 07788998899",
    invalidEmail: "Introduce un email válido.",
    pastDate: "No puedes reservar una fecha pasada.",
    closedTime: `Horario no disponible. Lunes a sábado ${formatOpeningHours(
      1,
    )}. Domingos ${formatOpeningHours(0)}.`,
    doubleBooking: "Ese horario ya no está disponible. Elige otro.",
    noProfessionalAvailable: "Ese horario ya no está disponible. Elige otro.",
    sundayWalkin: "Los domingos solo atendemos con reserva previa.",
    bookingError: "No se pudo guardar la reserva. Inténtalo otra vez.",
    consultTitle: "Consultar precio y horario",
    consultIntro:
      "Puedo recoger tu solicitud para que la profesional te indique precio y horario. No confirmo precio ni hora.",
    consultService:
      "¿Qué servicio quieres consultar?\n\n{list}\n\nResponde con el número.",
    consultDate: "¿Qué fecha prefieres? (YYYY-MM-DD)",
    consultTime: "¿A qué hora preferirías? (HH:MM)",
    consultAlt:
      "¿Tienes una hora alternativa? (HH:MM o escribe \"no\")",
    consultQuote:
      "¿Prefieres que la profesional te indique el precio?\n\n1. Prefiero que la profesional me indique el precio\n2. Quiero indicar un presupuesto orientativo",
    consultBudget: "¿Cuál es tu presupuesto orientativo? (£)",
    consultName: "¿Cuál es tu nombre?",
    consultPhone: "¿Tu teléfono móvil UK?",
    consultEmail: "¿Tu email? (o escribe \"no\")",
    consultNotes:
      "¿Alguna nota sobre tu cabello o el estilo? (o escribe \"no\")",
    consultSent:
      "✅ Solicitud enviada.\n\n{s}\n📅 {d} {t}\n\nPrecio a consultar. La profesional te contactará para confirmar precio y horario. Pago en efectivo en el salón.",
    consultError:
      "No se pudo enviar la solicitud. Inténtalo otra vez.",
  },

  en: {
    title: businessConfig.assistantName,
    online: "Online",
    placeholder: "Type a message...",
    initial: `Hi, I'm the ${businessConfig.businessName} assistant. How can I help you?`,
    quick: ["Book", "Discuss price and time", "Cancel", "Walk-in"],
    menu: "I can help with: book, cancel or join the walk-in queue.",
    askName: "Great. What's your name?",
    askPhone: "Thanks {n}. Your UK mobile number?",
    askEmail: "Perfect. What's your email?",
    askService: "Which service?\n\n{list}\n\nReply with the number.",
    askBarber:
      "Who would you like to book with?\n\n{list}\n\nReply with the number.",
    askDate: "Which date? (YYYY-MM-DD)",
    askTime: `What time? (HH:MM)\n\nMon-Sat: ${formatOpeningHours(
      1,
    )}\nSunday: booking only ${formatOpeningHours(0)}`,
    confirm:
      "✅ Booking confirmed!\n\n{n} — {s}\n📅 {d} at {t}\n💈 Professional: {b}\n📧 {e}\n💷 {c}{p}",
    cancelInfo:
      `To cancel or modify a booking, contact ${businessConfig.businessName} directly.`,
    walkinAsk: "Your name for the queue?",
    walkinJoined: "✅ You're in the queue! Estimated wait ~{w} min.",
    servicesList: "Our services:\n\n{list}",
    bye: "Didn't catch that 🤔. Try: book, cancel, walk-in or services.",
    invalid: "Invalid option. Try again.",
    invalidPhone: "Enter a valid UK mobile. Example: 07788998899",
    invalidEmail: "Enter a valid email.",
    pastDate: "You cannot book a past date.",
    closedTime: `Time not available. Monday-Saturday ${formatOpeningHours(
      1,
    )}. Sundays ${formatOpeningHours(0)}.`,
    doubleBooking: "That time is no longer available. Please choose another.",
    noProfessionalAvailable: "That time is no longer available. Please choose another.",
    sundayWalkin: "Sundays are booking only. Walk-ins unavailable.",
    bookingError: "Could not save the booking. Please try again.",
    consultTitle: "Discuss price and time",
    consultIntro:
      "I can take your request so the professional can quote the price and time. I don't confirm price or time.",
    consultService:
      "Which service would you like to discuss?\n\n{list}\n\nReply with the number.",
    consultDate: "Which date do you prefer? (YYYY-MM-DD)",
    consultTime: "What time would you prefer? (HH:MM)",
    consultAlt: "Any alternative time? (HH:MM or type \"no\")",
    consultQuote:
      "Would you like the professional to quote the price?\n\n1. I prefer the professional to quote the price\n2. I'd like to suggest a budget",
    consultBudget: "What is your indicative budget? (£)",
    consultName: "What's your name?",
    consultPhone: "Your UK mobile number?",
    consultEmail: "Your email? (or type \"no\")",
    consultNotes: "Any notes about your hair or the style? (or type \"no\")",
    consultSent:
      "✅ Request sent.\n\n{s}\n📅 {d} {t}\n\nPrice on consultation. The professional will contact you to confirm price and time. Cash payment at the salon.",
    consultError: "Could not send the request. Please try again.",
  },
};

function isValidUkMobile(phone: string) {
  const cleaned = phone.replace(/\s+/g, "");
  return /^(07\d{9}|\+447\d{9}|447\d{9})$/.test(cleaned);
}

function normalizeUkMobile(phone: string) {
  const cleaned = phone.replace(/\s+/g, "");

  if (cleaned.startsWith("+44")) return cleaned;
  if (cleaned.startsWith("44")) return `+${cleaned}`;
  if (cleaned.startsWith("07")) return `+44${cleaned.slice(1)}`;

  return cleaned;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function getTodayIso() {
  const d = new Date();

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(d.getDate()).padStart(2, "0")}`;
}

function isPastDate(date: string) {
  return date < getTodayIso();
}

function getDayOfWeek(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).getDay();
}

function timeToMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function normalizeTime(time: string) {
  const [h, m] = time.split(":");

  return `${String(Number(h)).padStart(2, "0")}:${String(Number(m)).padStart(
    2,
    "0",
  )}`;
}

function isValidOpeningTime(date: string, time: string, duration: number) {
  const window = getOpeningWindow(getDayOfWeek(date));

  if (!window) return false;

  const start = timeToMinutes(time);
  const end = start + duration;

  return start >= window.start && end <= window.end;
}

function isSunday(date: string) {
  return getDayOfWeek(date) === 0;
}

function isActiveBooking(status?: string) {
  return status === "confirmed" || status === "pending";
}

/** Services that require a price/time consultation (never quoted by the bot). */
const CONSULTATION_SLUGS = services
  .filter((s) => s.id !== "haircut")
  .map((s) => s.id);

function bookingOverlaps(
  booking: any,
  date: string,
  time: string,
  duration: number,
) {
  if (!isActiveBooking(booking.status)) return false;
  if (booking.date !== date) return false;

  const existingTime = String(booking.time || "").slice(0, 5);
  if (!existingTime || !existingTime.includes(":")) return false;

  const existingStart = timeToMinutes(existingTime);
  const existingDuration = Number(booking.duration) || 30;
  const existingEnd = existingStart + existingDuration;

  const newStart = timeToMinutes(time);
  const newEnd = newStart + duration;

  return newStart < existingEnd && newEnd > existingStart;
}

function professionalIsBusy(
  bookings: any[],
  professional: string,
  date: string,
  time: string,
  duration: number,
) {
  return bookings.some((booking) => {
    if (!bookingOverlaps(booking, date, time, duration)) return false;

    return (
      String(booking.barber || "").toLowerCase() === professional.toLowerCase()
    );
  });
}

function findAvailableProfessional(
  bookings: any[],
  professionals: string[],
  date: string,
  time: string,
  duration: number,
) {
  const available = professionals.filter(
    (professional) =>
      !professionalIsBusy(bookings, professional, date, time, duration),
  );

  if (available.length === 0) return null;

  const workload = available.map((professional) => {
    const count = bookings.filter(
      (booking) =>
        isActiveBooking(booking.status) &&
        booking.date === date &&
        String(booking.barber || "").toLowerCase() ===
          professional.toLowerCase(),
    ).length;

    return { professional, count };
  });

  workload.sort((a, b) => {
    if (a.count !== b.count) return a.count - b.count;
    return professionals.indexOf(a.professional) - professionals.indexOf(b.professional);
  });

  return workload[0].professional;
}

export default function PuntyAssistant({
  lang,
  setLang,
}: {
  lang: Lang;
  setLang: (l: Lang) => void;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [step, setStep] = useState<Step>({ name: "idle" });
  const [staffMap, setStaffMap] = useState<Record<string, string[]>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  // Compatible professionals come from staff_services (never hardcoded).
  useEffect(() => {
    let alive = true;

    loadCatalogue()
      .then((catalogue) => {
        if (!alive) return;
        const map: Record<string, string[]> = {};
        for (const [slug, staff] of Object.entries(catalogue.staffByService)) {
          map[slug] = staff.map((member) => member.name);
        }
        setStaffMap(map);
      })
      .catch((err: unknown) => {
        console.error("[assistant] catalogue load failed", err);
      });

    return () => {
      alive = false;
    };
  }, []);

  const staffForService = (service: (typeof services)[0]) =>
    staffMap[service.id] || [];

  const tt = T[lang];

  useEffect(() => {
    setMessages([
      {
        role: "bot",
        text: tt.initial,
        quick: tt.quick,
      },
    ]);

    setStep({ name: "idle" });
  }, [lang]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, open]);

  const push = (m: Msg | Msg[]) => {
    setMessages((prev) => [...prev, ...(Array.isArray(m) ? m : [m])]);
  };

  const serviceName = (s: (typeof services)[0]) =>
    lang === "es" ? s.name_es : s.name_en;

  const send = (raw: string) => {
    const text = raw.trim();
    if (!text) return;

    push({ role: "user", text });
    setInput("");

    setTimeout(() => respond(text), 300);
  };

  const respond = (text: string) => {
    const low = text.toLowerCase();

    if (/(english|inglés|ingles)\b/.test(low) && lang === "es") {
      setLang("en");
      return;
    }

    if (/(spanish|español|espanol)\b/.test(low) && lang === "en") {
      setLang("es");
      return;
    }

    if (step.name === "book") return handleBook(text);
    if (step.name === "walkin_name") return handleWalkin(text);

    if (/^(reservar|book|booking|reserva)/.test(low)) return startBook();

    if (/^(cancelar|cancel)/.test(low)) {
      return push({
        role: "bot",
        text: tt.cancelInfo,
        quick: tt.quick,
      });
    }

    if (/^(walk[- ]?in|cola|queue)/.test(low)) return startWalkin();

    if (/(servicios|services|precio|price)/.test(low)) return showServices();

    if (/^(hola|hi|hello|hey)/.test(low)) {
      return push({
        role: "bot",
        text: tt.menu,
        quick: tt.quick,
      });
    }

    push({
      role: "bot",
      text: tt.bye,
      quick: tt.quick,
    });
  };

  const startBook = () => {
    setStep({
      name: "book",
      field: "name",
      data: {},
    });

    push({
      role: "bot",
      text: tt.askName,
    });
  };

  const handleBook = async (text: string) => {
    if (step.name !== "book") return;

    const d = { ...step.data };

    if (step.field === "name") {
      d.name = text.trim();

      if (!d.name) {
        return push({
          role: "bot",
          text: tt.invalid,
        });
      }

      setStep({
        name: "book",
        field: "phone",
        data: d,
      });

      push({
        role: "bot",
        text: tt.askPhone.replace("{n}", d.name),
      });

      return;
    }

    if (step.field === "phone") {
      if (!isValidUkMobile(text)) {
        return push({
          role: "bot",
          text: tt.invalidPhone,
        });
      }

      d.phone = normalizeUkMobile(text);

      setStep({
        name: "book",
        field: "email",
        data: d,
      });

      push({
        role: "bot",
        text: tt.askEmail,
      });

      return;
    }

    if (step.field === "email") {
      if (!isValidEmail(text)) {
        return push({
          role: "bot",
          text: tt.invalidEmail,
        });
      }

      d.email = text.trim().toLowerCase();

      setStep({
        name: "book",
        field: "service",
        data: d,
      });

      const list = services
        .map(
          (s, i) =>
            `${i + 1}. ${serviceName(s)} — ${formatServicePrice(s.price, lang)}`,
        )
        .join("\n");

      push({
        role: "bot",
        text: tt.askService.replace("{list}", list),
      });

      return;
    }

    if (step.field === "service") {
      const idx = parseInt(text, 10) - 1;

      if (isNaN(idx) || !services[idx]) {
        return push({
          role: "bot",
          text: tt.invalid,
        });
      }

      d.service = services[idx];

      setStep({
        name: "book",
        field: "barber",
        data: d,
      });

      const professionals = staffForService(d.service);

      if (professionals.length === 1) {
        d.barber = professionals[0];

        setStep({ name: "book", field: "date", data: d });

        push({ role: "bot", text: tt.askDate });

        return;
      }

      const list = [
        `1. ${lang === "es" ? "Cualquiera disponible" : "Anyone available"}`,
        ...professionals.map((p, i) => `${i + 2}. ${p}`),
      ].join("\n");

      push({
        role: "bot",
        text: tt.askBarber.replace("{list}", list),
      });

      return;
    }

    if (step.field === "barber") {
      const idx = parseInt(text, 10) - 1;
      const professionals = staffForService(d.service);

      if (isNaN(idx) || idx < 0 || idx > professionals.length) {
        return push({
          role: "bot",
          text: tt.invalid,
        });
      }

      d.barber = idx === 0 ? "any" : professionals[idx - 1];

      setStep({
        name: "book",
        field: "date",
        data: d,
      });

      push({
        role: "bot",
        text: tt.askDate,
      });

      return;
    }

    if (step.field === "date") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        return push({
          role: "bot",
          text: tt.invalid,
        });
      }

      if (isPastDate(text)) {
        return push({
          role: "bot",
          text: tt.pastDate,
        });
      }

      d.date = text;

      setStep({
        name: "book",
        field: "time",
        data: d,
      });

      push({
        role: "bot",
        text: tt.askTime,
      });

      return;
    }

    if (step.field === "time") {
      if (!/^\d{1,2}:\d{2}$/.test(text)) {
        return push({
          role: "bot",
          text: tt.invalid,
        });
      }

      const normalizedTime = normalizeTime(text);

      if (!isValidOpeningTime(d.date, normalizedTime, d.service.duration)) {
        return push({
          role: "bot",
          text: tt.closedTime,
        });
      }

      d.time = normalizedTime;

      try {
        // Availability and professional selection are resolved by the
        // database inside create_booking (shared data layer, no duplication).
        const booking = {
          name: d.name,
          phone: d.phone,
          email: d.email,
          service: d.service.id,
          barber: d.barber,
          date: d.date,
          time: d.time,
          comments: `Reserva creada desde ${businessConfig.assistantName}`,
          price: d.service.price,
          duration: d.service.duration,
          createdAt: Date.now(),
          status: "confirmed" as const,
          business_id: businessConfig.businessId,
        };

        const saved = await createBooking(booking);
        const finalProfessional = saved.barber || d.barber;

        setStep({ name: "idle" });

        push({
          role: "bot",
          text: tt.confirm
            .replace("{n}", d.name)
            .replace("{s}", serviceName(d.service))
            .replace("{d}", d.date)
            .replace("{t}", d.time)
            .replace("{b}", finalProfessional)
            .replace("{e}", d.email)
            .replace(
              "{p}",
              formatServicePrice(saved.price ?? d.service.price, lang),
            )
            .replace("{c}", ""),
          quick: tt.quick,
        });
      } catch (error) {
        console.error("[assistant] booking failed", error);

        push({
          role: "bot",
          text: isSlotTakenError(error) ? tt.doubleBooking : tt.bookingError,
          quick: tt.quick,
        });
      }

    }
  };

  const startWalkin = () => {
    const today = getTodayIso();

    if (isSunday(today)) {
      return push({
        role: "bot",
        text: tt.sundayWalkin,
        quick: tt.quick,
      });
    }

    setStep({ name: "walkin_name" });

    push({
      role: "bot",
      text: tt.walkinAsk,
    });
  };

  const handleWalkin = async (text: string) => {
    const today = getTodayIso();

    if (isSunday(today)) {
      setStep({ name: "idle" });

      return push({
        role: "bot",
        text: tt.sundayWalkin,
        quick: tt.quick,
      });
    }

    await createWalkin(text.trim());

    setStep({ name: "idle" });

    push({
      role: "bot",
      text: tt.walkinJoined.replace("{w}", "15"),
      quick: tt.quick,
    });
  };

  const showServices = () => {
    const list = services
      .map(
        (s) =>
          `• ${s.icon} ${serviceName(s)} — ${formatServicePrice(s.price, lang)}\n  ${pricingCopy[lang].durationVaries}`,
      )
      .join("\n");

    push({
      role: "bot",
      text: tt.servicesList.replace("{list}", list),
      quick: tt.quick,
    });
  };

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-50 w-16 h-16 rounded-full shadow-soft bg-gradient-brand flex items-center justify-center hover:scale-110 transition group"
        aria-label={businessConfig.assistantName}
      >
        {open ? (
          <span className="text-white text-2xl">×</span>
        ) : (
          <>
            <img
              src={logo}
              alt=""
              className="w-12 h-12 rounded-full border-2 border-white object-cover"
            />
            <span className="absolute top-1 right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse" />
          </>
        )}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-50 w-[calc(100vw-2.5rem)] sm:w-[380px] h-[560px] max-h-[calc(100vh-7rem)] bg-card rounded-3xl shadow-soft border border-border flex flex-col overflow-hidden animate-fade-up">
          <div className="bg-gradient-brand text-white p-4 flex items-center gap-3">
            <img
              src={logo}
              alt=""
              className="w-10 h-10 rounded-full border-2 border-white/50"
            />

            <div className="flex-1">
              <div className="font-bold text-sm">{tt.title}</div>

              <div className="text-[11px] text-white/80 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                {tt.online}
              </div>
            </div>

            <button
              onClick={() => setOpen(false)}
              className="text-white/80 hover:text-white text-xl px-2"
              aria-label={lang === "es" ? "Cerrar" : "Close"}
            >
              ×
            </button>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-3 bg-secondary/30"
          >
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {m.role === "bot" && (
                  <img
                    src={logo}
                    alt=""
                    className="w-7 h-7 rounded-full mr-2 mt-auto flex-shrink-0"
                  />
                )}

                <div className="max-w-[78%]">
                  <div
                    className={`px-4 py-2.5 rounded-2xl text-sm whitespace-pre-line leading-relaxed shadow-sm ${
                      m.role === "user"
                        ? "bg-brand-blue text-white rounded-br-sm"
                        : "bg-white text-foreground rounded-bl-sm"
                    }`}
                  >
                    {m.text}
                  </div>

                  {m.quick && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {m.quick.map((q) => (
                        <button
                          key={q}
                          onClick={() => send(q)}
                          className="text-xs px-3 py-1.5 bg-white border border-brand-blue/20 text-brand-blue rounded-full hover:bg-brand-blue hover:text-white transition font-medium"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="p-3 border-t border-border bg-card flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={tt.placeholder}
              className="flex-1 px-4 py-2.5 rounded-full bg-secondary text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
            />

            <button
              type="submit"
              className="w-10 h-10 rounded-full bg-gradient-brand text-white flex items-center justify-center hover:scale-105 transition flex-shrink-0"
              aria-label={lang === "es" ? "Enviar" : "Send"}
            >
              ➤
            </button>
          </form>
        </div>
      )}
    </>
  );
}
