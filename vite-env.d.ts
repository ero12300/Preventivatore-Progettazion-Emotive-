/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** URL completo dove Supabase deve reindirizzare dopo il magic link (produzione). Es. https://preventivatore.emotivedesign.it/#auth-portal */
  readonly VITE_AUTH_REDIRECT_URL?: string;
  /** Link pubblico del CRM operativo (default: https://crm-next-app-two.vercel.app). */
  readonly VITE_CRM_APP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
