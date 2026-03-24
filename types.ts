
export enum AppView {
  HOME = 'home',
  CREATE_QUOTE = 'create-quote',
  QUOTE_PREVIEW = 'quote-preview',
  SUCCESS = 'success'
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
  
  // Stato
  isPaid: boolean;
}

export interface NavProps {
  currentView: AppView;
  setView: (view: AppView) => void;
}
