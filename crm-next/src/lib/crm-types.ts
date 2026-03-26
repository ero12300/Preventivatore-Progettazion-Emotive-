export const PRACTICE_STATUSES = [
  "preventivo_inviato",
  "in_attesa_documenti",
  "rilievo_da_prenotare",
  "rilievo_prenotato",
  "in_progettazione",
  "presentazione_da_prenotare",
  "presentazione_prenotata",
  "in_revisione",
  "chiusa_vinta",
  "chiusa_persa",
] as const;

export type PracticeStatus = (typeof PRACTICE_STATUSES)[number];

export const APPOINTMENT_TYPES = [
  "rilievo_locale",
  "presentazione_progetto",
  "revisione_progetto",
  "follow_up",
  "commerciale",
] as const;

export type AppointmentType = (typeof APPOINTMENT_TYPES)[number];

export const APPOINTMENT_MODES = ["remoto", "in_presenza"] as const;
export type AppointmentMode = (typeof APPOINTMENT_MODES)[number];

export const USER_ROLES = ["admin", "progettista", "commerciale"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const SCHEDULER_PROVIDERS = ["calendly", "calcom"] as const;
export type SchedulerProvider = (typeof SCHEDULER_PROVIDERS)[number];
