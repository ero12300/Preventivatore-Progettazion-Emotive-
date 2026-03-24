
export enum AppView {
  HOME = 'home',
  CREATE_QUOTE = 'create-quote',
  QUOTE_PREVIEW = 'quote-preview',
  SUCCESS = 'success',
  ADMIN_PRICING = 'admin-pricing',
  AUTH_PORTAL = 'auth-portal',
  PARTNER_DASHBOARD = 'partner-dashboard'
}

export interface ProjectState {
  // Dati Cliente
  firstName: string;
  lastName: string;
  companyName?: string;
  vatNumber?: string;
  email: string;
  phone?: string;
  address?: string;
  
  // Dati Progetto
  businessType: string;
  location: string;
  squareMeters?: string;
  projectDescription?: string;
  
  // Prezzo Personalizzato
  totalPrice: number; // Prezzo totale del progetto
  depositPercentage: number; // Percentuale acconto (default 30%)
  pricingRuleId?: string;
  pricingRuleLabel?: string;
  appliedDiscountCode?: string;
  appliedReferralCode?: string;
  discountCode?: string;
  referralCode?: string;
  leadCaptured?: boolean;
  leadCapturedAt?: string;
  leadNumber?: string;
  /** ISO timestamp quando email+PDF sono stati inviati al cliente */
  quotePdfSentAt?: string;
  
  // Stato
  isPaid: boolean;
}

export interface NavProps {
  currentView: AppView;
  setView: (view: AppView) => void;
}

export type UserRole = 'admin' | 'partner' | 'unknown';
