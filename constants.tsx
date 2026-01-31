
import { DB, DayConfig, Category } from './types';

const defaultServices = { table: true, takeaway: true, delivery: true };

const defaultWeek: DayConfig[] = [
  { day: 'Lunedì', enableShift1: false, open1: '12:00', close1: '14:30', services1: defaultServices, enableShift2: true, open2: '18:30', close2: '23:00', services2: defaultServices },
  { day: 'Martedì', enableShift1: false, open1: '12:00', close1: '14:30', services1: defaultServices, enableShift2: true, open2: '18:30', close2: '23:00', services2: defaultServices },
  { day: 'Mercoledì', enableShift1: false, open1: '12:00', close1: '14:30', services1: defaultServices, enableShift2: true, open2: '18:30', close2: '23:00', services2: defaultServices },
  { day: 'Giovedì', enableShift1: false, open1: '12:00', close1: '14:30', services1: defaultServices, enableShift2: true, open2: '18:30', close2: '23:00', services2: defaultServices },
  { day: 'Venerdì', enableShift1: false, open1: '12:00', close1: '14:30', services1: defaultServices, enableShift2: true, open2: '18:30', close2: '00:00', services2: defaultServices },
  { day: 'Sabato', enableShift1: false, open1: '12:00', close1: '14:30', services1: defaultServices, enableShift2: true, open2: '18:30', close2: '00:00', services2: defaultServices },
  { day: 'Domenica', enableShift1: true, open1: '12:00', close1: '14:30', services1: defaultServices, enableShift2: true, open2: '18:30', close2: '23:00', services2: defaultServices },
];

const defaultCategories: Category[] = ['Pizze', 'Cucina', 'Bevande', 'Dessert'];

export const INITIAL_DB: DB = {
  users: [
    { 
      id: 'admin-id', 
      username: 'admin', 
      email: 'admin@pizzaflow.it',
      password: 'admin', 
      mansioni: ['Amministratore', 'Statistiche'],
      authorizedDevices: []
    }
  ],
  menu: [
    { id: 'm1', name: 'Margherita', price: 7, category: 'Pizze', description: 'Pomodoro, mozzarella, basilico', visible: true, imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?q=80&w=500', requiresCooking: true, order: 1, allowedExtraIds: [], defaultIngredientIds: [] },
    { id: 'm2', name: 'Diavola', price: 9, category: 'Pizze', description: 'Pomodoro, mozzarella, salame piccante', visible: true, imageUrl: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?q=80&w=500', requiresCooking: true, order: 2, allowedExtraIds: [], defaultIngredientIds: [] },
    { id: 'm3', name: 'Capricciosa', price: 10, category: 'Pizze', description: 'Pomodoro, mozzarella, funghi, carciofi, prosciutto', visible: true, imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=500', requiresCooking: true, order: 3, allowedExtraIds: [], defaultIngredientIds: [] },
    { id: 'm4', name: 'Boscaiola', price: 9.5, category: 'Pizze', description: 'Mozzarella, funghi, salsiccia, panna', visible: true, imageUrl: '', requiresCooking: true, order: 4, allowedExtraIds: [], defaultIngredientIds: [] },
    { id: 'c1', name: 'Patatine Fritte', price: 4, category: 'Cucina', description: 'Porzione grande con salse', visible: true, imageUrl: 'https://images.unsplash.com/photo-1630384060421-a4323ceca041?q=80&w=500', requiresCooking: true, order: 1, allowedExtraIds: [], defaultIngredientIds: [] },
    { id: 'c2', name: 'Mix Rustici', price: 6, category: 'Cucina', description: 'Arancini, crocchette, mozzarelline', visible: true, imageUrl: '', requiresCooking: true, order: 2, allowedExtraIds: [], defaultIngredientIds: [] },
    { id: 'b1', name: 'Coca Cola', price: 2.5, category: 'Bevande', description: '33cl in vetro', visible: true, imageUrl: '', requiresCooking: false, order: 1, allowedExtraIds: [], defaultIngredientIds: [] },
    { id: 'b2', name: 'Fanta', price: 2.5, category: 'Bevande', description: '33cl in vetro', visible: true, imageUrl: '', requiresCooking: false, order: 2, allowedExtraIds: [], defaultIngredientIds: [] },
    { id: 'b3', name: 'Birra Moretti', price: 3.5, category: 'Bevande', description: '33cl', visible: true, imageUrl: '', requiresCooking: false, order: 3, allowedExtraIds: [], defaultIngredientIds: [] },
    { id: 'd1', name: 'Tiramisù', price: 5, category: 'Dessert', description: 'Fatto in casa secondo tradizione', visible: true, imageUrl: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?q=80&w=500', requiresCooking: false, order: 1, allowedExtraIds: [], defaultIngredientIds: [] },
    { id: 'd2', name: 'Cannolo Siciliano', price: 3.5, category: 'Dessert', description: 'Cialda croccante e ricotta fresca', visible: true, imageUrl: '', requiresCooking: false, order: 2, allowedExtraIds: [], defaultIngredientIds: [] }
  ],
  tables: [
    { id: 1, name: 'T1', capacity: 2, status: 'free' },
    { id: 2, name: 'T2', capacity: 2, status: 'free' },
    { id: 3, name: 'T3', capacity: 4, status: 'free' },
    { id: 4, name: 'T4', capacity: 4, status: 'free' },
    { id: 5, name: 'T5', capacity: 4, status: 'free' },
    { id: 6, name: 'T6', capacity: 6, status: 'free' },
    { id: 7, name: 'T7', capacity: 6, status: 'free' },
    { id: 8, name: 'T8', capacity: 8, status: 'free' }
  ],
  orders: [],
  settings: {
    slotDuration: 15,
    maxPizzePerSlot: 10,
    weeklyConfig: defaultWeek,
    extraordinaryClosures: [],
    defaultTableDuration: 90,
    tableReservationMode: 'flexible',
    tableConfig: {
      mode: 'libero',
      fixedTurns: ['12:30', '14:00', '19:30', '21:30'],
      stayDuration: 90,
      maxFutureDays: 60,
      coverCharge: 2.00
    },
    categoryOrder: defaultCategories,
    enable2FA: false,
    systemConfig: {
      enable2FA: false,
      moduleTables: true,
      moduleTakeaway: true,
      moduleDelivery: true,
      moduleStats: false
    },
    whatsappConfig: {
      enabled: true,
      tableAccept: "Ciao {nome}, la tua prenotazione per {pax} persone del {data} alle {ora} è confermata. Ti aspettiamo!",
      tableReject: "Ciao {nome}, purtroppo siamo al completo per il {data} alle {ora}. Contattaci telefonicamente per trovare un'altra soluzione.",
      foodAccept: "Ciao {nome}, il tuo ordine è confermato per le ore {ora}.\nRiepilogo: {ordine}\nTotale: €{totale}. Grazie!",
      foodReject: "Ciao {nome}, purtroppo non riusciamo ad evadere il tuo ordine per le {ora}. Scusaci per il disagio."
    },
    siteConfig: {
      heroTitle: 'La Vera Pizza all\'Ennese',
      heroSubtitle: 'Tradizione, passione e ingredienti a km 0. Scopri il gusto autentico cotto nel forno a legna.',
      heroImage: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?q=80&w=2069&auto=format&fit=crop',
      homeDescription: 'Ogni nostra pizza nasce da un\'attenta selezione di farine siciliane e un lungo processo di lievitazione naturale di 48 ore. Il calore del forno a legna fa il resto, regalando quella croccantezza e quel profumo inconfondibile che ci contraddistinguono da generazioni.',
      homeImage: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=2074&auto=format&fit=crop',
      aboutTitle: 'Le Nostre Radici',
      aboutText: 'Dal 1950, la nostra famiglia impasta farina e acqua con la stessa passione. Tutto è iniziato con Nonno Giuseppe, che ha portato a Enna i segreti della lievitazione naturale.',
      aboutImage: 'https://images.unsplash.com/photo-1595854341469-51981272ea7e?q=80&w=2070&auto=format&fit=crop',
      aboutTitle2: 'Eccellenza nel Calice',
      aboutText2: 'Non solo pizza: selezioniamo accuratamente birre artigianali del territorio e vini siciliani che esaltano i sapori delle nostre creazioni, per un\'esperienza sensoriale completa.',
      aboutImage2: 'https://images.unsplash.com/photo-1510626176961-4b57d4fbad03?q=80&w=1974&auto=format&fit=crop',
      contactAddress: 'Via Roma, 123, 94100 Enna (EN)',
      contactPhone: '+39 0935 123456',
      contactEmail: 'info@artedellapizza.it',
      contactImage: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?q=80&w=2070&auto=format&fit=crop',
      socialInstagram: '',
      socialFacebook: '',
      socialTiktok: ''
    },
    globalExtras: [],
    globalIngredients: []
  },
  theme: 'light'
};
