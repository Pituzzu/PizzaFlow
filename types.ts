
export type Mansione = 'Amministratore' | 'Cameriere' | 'Cucina' | 'Sala' | 'Prenotazioni' | 'Impostazioni' | 'Corriere' | 'Cassa' | 'Statistiche';

export interface User {
  id: string;
  username: string;
  email: string; 
  password: string;
  mansioni: Mansione[];
  authorizedDevices: string[]; 
}

export type Category = string; 

export interface Extra {
  id: string;
  name: string;
  price: number;
}

export interface Ingredient {
  id: string;
  name: string;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: Category;
  description: string;
  imageUrl?: string; 
  visible: boolean; 
  requiresCooking: boolean; 
  order?: number; 
  allowedExtraIds?: string[]; // IDs dei supplementi abilitati per questo piatto
  defaultIngredientIds?: string[]; // IDs degli ingredienti base presenti nel piatto
}

export type ItemStatus = 'new' | 'preparing' | 'ready' | 'served';

export interface SelectedExtra {
  id: string;
  name: string;
  price: number;
}

export interface OrderItem {
  id: string;
  menuId: string;
  name: string;
  price: number;
  status: ItemStatus;
  category: Category;
  requiresCooking: boolean;
  isPaid?: boolean; 
  selectedExtras?: SelectedExtra[]; // Supplementi scelti
  removedIngredientIds?: string[]; // Ingredienti rimossi
}

export type OrderType = 'asporto' | 'consegna' | 'tavolo';
// PaymentMethod deprecato per uso singolo, mantenuto per compatibilità legacy se serve, ma useremo 'method' nelle transazioni
export type PaymentMethod = 'Contanti' | 'Carta' | 'Satispay' | 'Bonifico' | 'Altro';

export interface PaymentTransaction {
    id: string;
    amount: number;
    method: 'contanti' | 'carta';
    timestamp: number;
}

export interface Order {
  id: string;
  type: OrderType;
  tableId?: number; 
  tableIds?: number[]; 
  customCapacity?: number; 
  customerName: string;
  customerPhone?: string; 
  customerStreet?: string;
  customerCivic?: string;
  customerCity?: string;
  customerExtra?: string; 
  customerAddress?: string; 
  orderNotes?: string; 
  pax?: number; 
  duration?: number;
  time: string;
  date?: string; 
  items: OrderItem[];
  timestamp: number;
  isAccepted: boolean;
  isArchived: boolean;
  isShipped?: boolean; 
  receivedAmount?: number; // Legacy field
  assignedCourierId?: string; 
  assignedChefId?: string;
  // Tracking e Contabilità
  createdBy?: string; // Username (Sala/Prenotazioni)
  closedBy?: string; // Username (Chi ha incassato/Corriere)
  kitchenDoneBy?: string; // Username (Chi ha completato in cucina)
  coverChargeTotal?: number; // Totale addebitato per coperto (snapshot al momento chiusura o calcolo live)
  paidCoverCharges?: number; // Numero di quote coperto già saldate
  payments?: PaymentTransaction[]; // Array transazioni
}

export interface Table {
  id: number;
  name?: string; 
  capacity: number; 
  status: 'free' | 'occupied' | 'billing';
  assignedName?: string;
}

export interface ServiceAvailability {
  table: boolean;
  takeaway: boolean;
  delivery: boolean;
}

export interface DayConfig {
  day: string; 
  enableShift1: boolean; 
  open1: string; close1: string; 
  services1: ServiceAvailability;
  enableShift2: boolean; 
  open2: string; close2: string; 
  services2: ServiceAvailability;
}

export interface SiteConfig {
  heroTitle: string;
  heroSubtitle: string;
  heroImage: string;
  homeDescription: string;
  homeImage: string;
  aboutTitle: string;
  aboutText: string;
  aboutImage: string;
  aboutTitle2: string;
  aboutText2: string;
  aboutImage2: string;
  contactAddress: string;
  contactPhone: string;
  contactEmail: string;
  contactImage: string;
  socialInstagram?: string;
  socialFacebook?: string;
  socialTiktok?: string;
}

export interface WhatsAppConfig {
  enabled: boolean;
  tableAccept: string;
  tableReject: string;
  foodAccept: string;
  foodReject: string;
}

export interface SystemConfig {
  enable2FA: boolean;
  moduleTables: boolean;
  moduleTakeaway: boolean;
  moduleDelivery: boolean;
  moduleStats: boolean;
}

export interface TableConfig {
  mode: 'libero' | 'turni' | 'durata';
  fixedTurns: string[];
  stayDuration: number;
  maxFutureDays: number;
  coverCharge: number; // Costo coperto per persona
}

export interface Settings {
  slotDuration: number; 
  maxPizzePerSlot: number; 
  weeklyConfig: DayConfig[];
  extraordinaryClosures: string[]; 
  holidayStart?: string;
  holidayEnd?: string;
  defaultTableDuration: number;
  tableReservationMode: 'flexible' | 'fixed';
  tableConfig: TableConfig;
  siteConfig: SiteConfig; 
  categoryOrder: Category[];
  whatsappConfig: WhatsAppConfig;
  enable2FA: boolean; 
  systemConfig: SystemConfig;
  globalExtras: Extra[];
  globalIngredients: Ingredient[];
}

export interface DB {
  users: User[];
  menu: MenuItem[];
  tables: Table[];
  orders: Order[];
  settings: Settings;
  theme: 'light' | 'dark';
}
