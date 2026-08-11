export type Lang = "es" | "en";

export const translations = {
  es: {
    nav: {
      home: "Inicio",
      services: "Servicios",
      booking: "Reservar",
      walkin: "Walk-in",
      contact: "Contacto",
    },
    cta: "Reservar ahora",
    hero: {
      title: "Tu corte, a tu hora. Sin esperas.",
      subtitle: "Reserva online o entra en cola sin complicaciones.",
      book: "Reservar",
      how: "Cómo funciona",
    },
    problem: {
      title: "El problema",
      subtitle: "Las barberías tradicionales pierden clientes cada día.",
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
    reviews: {
      title: "Lo que dicen nuestros clientes",
      subtitle: "Opiniones reales de nuestros clientes.",
      empty: "Aún no hay reseñas disponibles.",
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
      successDesc: "Te esperamos en El Punty Barber Shop.",
      close: "Cerrar",
      loadingTimes: "Cargando horarios...",
      selectTime: "Selecciona una hora",
      chooseDateFirst: "Primero elige fecha",
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
      title: "Por qué El Punty",
      items: [
        { t: "Sin esperas", d: "Tu tiempo vale. Lo respetamos." },
        { t: "Más control", d: "Tú decides cuándo y con quién." },
        { t: "Mejor experiencia", d: "Local moderno y acogedor." },
        { t: "Atención rápida", d: "Profesionales eficientes." },
      ],
    },
    footer: {
      address: "Dirección",
      hours: "Horario",
      mon: "Lunes-Sábado: 09:00–19:00",
      sun: "Domingo: 10:00–17:00",
      rights: "Todos los derechos reservados.",
    },
  },

  en: {
    nav: {
      home: "Home",
      services: "Services",
      booking: "Book",
      walkin: "Walk-in",
      contact: "Contact",
    },
    cta: "Book now",
    hero: {
      title: "Your cut, on your time. No waiting.",
      subtitle: "Book online or join the queue, hassle-free.",
      book: "Book now",
      how: "How it works",
    },
    problem: {
      title: "The problem",
      subtitle: "Traditional barbershops lose customers every day.",
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
    reviews: {
      title: "What our clients say",
      subtitle: "Real reviews from our clients.",
      empty: "No reviews available yet.",
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
      successDesc: "We'll see you at El Punty Barber Shop.",
      close: "Close",
      loadingTimes: "Loading times...",
      selectTime: "Select a time",
      chooseDateFirst: "Choose a date first",
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
      title: "Why El Punty",
      items: [
        { t: "No waiting", d: "Your time matters. We respect it." },
        { t: "More control", d: "You decide when and with whom." },
        { t: "Better experience", d: "Modern, welcoming space." },
        { t: "Fast service", d: "Efficient professionals." },
      ],
    },
    footer: {
      address: "Address",
      hours: "Hours",
      mon: "Monday-Saturday: 09:00–19:00",
      sun: "Sunday: 10:00–17:00",
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