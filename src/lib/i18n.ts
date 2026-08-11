export type Lang = "es" | "en";

export const translations = {
  es: {
    brandTagline: "PELUQUERÍA & BELLEZA",
    nav: {
      home: "Inicio",
      services: "Servicios",
      booking: "Reservar",
      walkin: "Walk-in",
      contact: "Contacto",
    },
    cta: "Reservar ahora",

    hero: {
      title: "Tu cita, a tu hora. Sin esperas.",
      subtitle: "Reserva online o entra en cola sin complicaciones.",
      book: "Reservar",
      how: "Cómo funciona",
    },
    problem: {
      title: "El problema",
      subtitle: "Los salones tradicionales pierden clientes cada día.",
      items: [
        { t: "Alta demanda", d: "Más clientes de los que se pueden atender." },
        { t: "Saturación", d: "Horas pico que colapsan el local." },
        { t: "Baja digitalización", d: "Sin sistema de reservas moderno." },
        { t: "Esperas largas", d: "Los clientes se van antes de ser atendidos." },
      ],
    },
    data: {
      title: "Los números no mienten",
      lost: "pérdida de clientes",
      money: "estimado en ingresos perdidos al año",
    },
    solution: {
      title: "La solución",
      subtitle: "Un sistema simple, en 3 pasos.",
      steps: [
        { t: "Reserva online", d: "Elige día, hora y profesional en segundos." },
        { t: "Walk-in inteligente", d: "Únete a la cola virtual desde tu móvil." },
        { t: "Gestión simple", d: "Todo organizado, sin esperas innecesarias." },
      ],
    },
    services: {
      title: "Nuestros servicios",
      subtitle: "Calidad profesional. Precios honestos.",
      min: "min",
    },
    styles: {
      title: "Trenzado y peinados",
      subtitle: "Nuestros estilos de trenzado, twists y crochet.",
      comingSoon: "Próximamente disponible para reserva online",
      book: "Reservar",
      view: "Ver servicio",
    },
    reviews: {
      title: "Lo que dicen nuestros clientes",
      subtitle: "Opiniones reales de nuestros clientes.",
      empty: "Aún no hay reseñas disponibles.",
      loading: "Cargando reseñas...",
    },

    booking: {
      title: "Reserva tu cita",
      subtitle: "Completa el formulario y recibe confirmación al instante.",
      name: "Nombre completo",
      phone: "Teléfono",
      email: "Email",
      service: "Servicio",
      barber: "Profesional",
      any: "Cualquiera",
      date: "Fecha",
      time: "Hora",
      comments: "Comentarios (opcional)",
      price: "Precio",
      duration: "Duración",
      submit: "Confirmar reserva",
      success: "¡Reserva confirmada!",
      successDesc: "Te esperamos en nuestro salón.",
      close: "Cerrar",
      loadingTimes: "Cargando horarios...",
      selectTime: "Selecciona una hora",
      chooseDateFirst: "Primero elige fecha",
      saving: "Guardando…",
      invalidPhone: "Introduce un móvil UK válido. Ejemplo: 07788998899",
      invalidEmail: "Introduce un email válido.",
      pastDate: "No puedes reservar una fecha pasada.",
      outsideHours: "Horario no disponible. Abrimos todos los días {h}.",
      slotTaken:
        "Este horario ya no está disponible. Selecciona otro horario.",
      saveError: "No se pudo guardar la reserva. Inténtalo otra vez.",
    },
    walkin: {
      title: "Walk-in: cola virtual",
      subtitle: "Únete sin salir de casa. Llega cuando sea tu turno.",
      people: "personas en cola",
      wait: "Espera estimada",
      join: "Unirme a la cola",
      joined: "¡Estás en la cola!",
      position: "Tu posición",
    },
    benefits: {
      title: "Por qué elegirnos",
      items: [
        { t: "Sin esperas", d: "Tu tiempo vale. Lo respetamos." },
        { t: "Más control", d: "Tú decides cuándo y con quién." },
        { t: "Mejor experiencia", d: "Local moderno y acogedor." },
        { t: "Atención rápida", d: "Profesionales eficientes." },
      ],
    },
    footer: {
      description:
        "Peluquería y centro de belleza. Reserva online tu cita de peluquería, color o belleza en segundos.",
      address: "Dirección",
      hours: "Horario",
      weekdays: "Lunes–Sábado",
      sunday: "Domingo",
      rights: "Todos los derechos reservados.",
    },

  },

  en: {
    brandTagline: "HAIR & BEAUTY",
    nav: {

      home: "Home",
      services: "Services",
      booking: "Book",
      walkin: "Walk-in",
      contact: "Contact",
    },
    cta: "Book now",
    hero: {
      title: "Your appointment, on your time. No waiting.",
      subtitle: "Book online or join the queue, hassle-free.",
      book: "Book now",
      how: "How it works",
    },
    problem: {
      title: "The problem",
      subtitle: "Traditional salons lose customers every day.",
      items: [
        { t: "High demand", d: "More clients than can be handled." },
        { t: "Saturation", d: "Peak hours overwhelm the shop." },
        { t: "Low digitalization", d: "No modern booking system." },
        { t: "Long waits", d: "Clients leave before being served." },
      ],
    },
    data: {
      title: "The numbers don't lie",
      lost: "customer loss",
      money: "estimated lost revenue per year",
    },
    solution: {
      title: "The solution",
      subtitle: "A simple system, in 3 steps.",
      steps: [
        { t: "Online booking", d: "Pick day, time and professional in seconds." },
        { t: "Smart walk-in", d: "Join the virtual queue from your phone." },
        { t: "Simple management", d: "Everything organized, no waiting." },
      ],
    },
    services: {
      title: "Our services",
      subtitle: "Professional quality. Honest prices.",
      min: "min",
    },
    styles: {
      title: "Braiding & hairstyles",
      subtitle: "Our braiding, twist and crochet styles.",
      comingSoon: "Online booking coming soon",
      book: "Book",
      view: "View service",
    },
    reviews: {
      title: "What our clients say",
      subtitle: "Real reviews from our clients.",
      empty: "No reviews available yet.",
      loading: "Loading reviews...",
    },

    booking: {
      title: "Book your appointment",
      subtitle: "Fill in the form and get instant confirmation.",
      name: "Full name",
      phone: "Phone",
      email: "Email",
      service: "Service",
      barber: "Professional",
      any: "Anyone",
      date: "Date",
      time: "Time",
      comments: "Comments (optional)",
      price: "Price",
      duration: "Duration",
      submit: "Confirm booking",
      success: "Booking confirmed!",
      successDesc: "We look forward to welcoming you to our salon.",
      close: "Close",
      loadingTimes: "Loading times...",
      selectTime: "Select a time",
      chooseDateFirst: "Choose a date first",
      saving: "Saving…",
      invalidPhone: "Enter a valid UK mobile. Example: 07788998899",
      invalidEmail: "Enter a valid email address.",
      pastDate: "You cannot book a past date.",
      outsideHours: "Time not available. We open every day {h}.",
      slotTaken:
        "This time is no longer available. Please choose another time.",
      saveError: "The booking could not be saved. Please try again.",
    },
    walkin: {
      title: "Walk-in: virtual queue",
      subtitle: "Join without leaving home. Arrive when it's your turn.",
      people: "people in queue",
      wait: "Estimated wait",
      join: "Join the queue",
      joined: "You're in the queue!",
      position: "Your position",
    },
    benefits: {
      title: "Why choose us",
      items: [
        { t: "No waiting", d: "Your time matters. We respect it." },
        { t: "More control", d: "You decide when and with whom." },
        { t: "Better experience", d: "Modern, welcoming space." },
        { t: "Fast service", d: "Efficient professionals." },
      ],
    },
    footer: {
      description:
        "Hair & beauty salon. Book your hair, colour or beauty appointment online in seconds.",
      address: "Address",
      hours: "Hours",
      weekdays: "Monday–Saturday",
      sunday: "Sunday",
      rights: "All rights reserved.",
    },

  },
};

// Placeholder catalogue for the new salon. The final catalogue comes later.
export const services = [
  {
    id: "cut_styling",
    icon: "✂️",
    category: "hair",
    name_es: "Corte y peinado",
    name_en: "Cut & styling",
    category_es: "Peluquería",
    category_en: "Hair",
    price: 35,
    duration: 60,
  },
  {
    id: "color",
    icon: "🎨",
    category: "hair",
    name_es: "Color",
    name_en: "Colour",
    category_es: "Color",
    category_en: "Colour",
    price: 65,
    duration: 120,
  },
  {
    id: "manicure",
    icon: "💅",
    category: "beauty",
    name_es: "Manicura",
    name_en: "Manicure",
    category_es: "Belleza",
    category_en: "Beauty",
    price: 30,
    duration: 60,
  },
];

// Single source of truth for professionals (home, booking, assistant, admin).
export const professionals = ["Profesional 1", "Profesional 2"];

// Aliases kept so existing category-based lookups keep working.
export const barberProfessionals = professionals;
export const hairProfessionals = professionals;
export const barbers = professionals;
/**
 * Visual braiding/hairstyle catalogue.
 * IMPORTANT: these entries are VISUAL ONLY. They are not part of the
 * bookable catalogue (public.services) yet, so `bookable` stays false
 * until each one is created in Supabase with a real price, duration and
 * staff_services association. Nothing here is ever sent to create_booking.
 */
export type StyleShowcaseItem = {
  id: string;
  image: string;
  bookable: false;
  name_es: string;
  name_en: string;
  desc_es: string;
  desc_en: string;
  alt_es: string;
  alt_en: string;
};

export const styleShowcase: StyleShowcaseItem[] = [
  {
    id: "cornrows",
    image: "cornrows-grid",
    bookable: false,
    name_es: "Trenzas pegadas",
    name_en: "Cornrows",
    desc_es:
      "Trenzas pegadas al cuero cabelludo con diseños limpios y personalizados.",
    desc_en: "Close-to-scalp braids with clean, personalised patterns.",
    alt_es: "Ejemplo de trenzas pegadas",
    alt_en: "Cornrows hairstyle example",
  },
  {
    id: "individual_braids",
    image: "feedin-braids",
    bookable: false,
    name_es: "Trenza individual",
    name_en: "Individual braids",
    desc_es:
      "Trenzas individuales versátiles disponibles en diferentes largos y estilos.",
    desc_en:
      "Versatile individual braids available in different lengths and styles.",
    alt_es: "Ejemplo de trenzas individuales largas",
    alt_en: "Long individual braids hairstyle example",
  },
  {
    id: "knotless_braids",
    image: "knotless-colour",
    bookable: false,
    name_es: "Trenza sin nudo",
    name_en: "Knotless braids",
    desc_es: "Trenzas sin nudo con acabado ligero, natural y cómodo.",
    desc_en:
      "Lightweight knotless braids with a natural and comfortable finish.",
    alt_es: "Ejemplo de trenzas sin nudo con extensiones de color",
    alt_en: "Knotless braids with coloured extensions example",
  },
  {
    id: "micro_twists",
    image: "box-braids",
    bookable: false,
    name_es: "Micro-twist",
    name_en: "Micro twists",
    desc_es: "Twists finos y definidos para un acabado elegante y duradero.",
    desc_en: "Fine, defined twists for an elegant and long-lasting finish.",
    alt_es: "Ejemplo de micro-twists y trenzas finas",
    alt_en: "Micro twists and fine braids example",
  },
  {
    id: "natural_twists",
    image: "cornrows-bun",
    bookable: false,
    name_es: "Twist en cabello natural",
    name_en: "Natural hair twists",
    desc_es:
      "Twists realizados sobre cabello natural para definir, proteger y estilizar.",
    desc_en: "Twists created on natural hair to define, protect and style.",
    alt_es: "Ejemplo de peinado con twists sobre cabello natural",
    alt_en: "Natural hair twists hairstyle example",
  },
  {
    id: "crochet_braids",
    image: "crochet-curly",
    bookable: false,
    name_es: "Crochet braids",
    name_en: "Crochet braids",
    desc_es:
      "Instalación de crochet braids con diferentes texturas, largos y estilos.",
    desc_en:
      "Crochet braid installation available in different textures, lengths and styles.",
    alt_es: "Ejemplo de crochet braids con textura rizada",
    alt_en: "Crochet braids with curly texture example",
  },
  {
    id: "wash_blowdry",
    image: "salon",
    bookable: false,
    name_es: "Lavado y secado",
    name_en: "Wash and blow-dry",
    desc_es:
      "Lavado profesional y secado para dejar el cabello limpio, suave y preparado.",
    desc_en:
      "Professional wash and blow-dry for clean, soft and styled hair.",
    alt_es: "Interior del salón Brightobarber",
    alt_en: "Brightobarber salon interior",
  },
];
