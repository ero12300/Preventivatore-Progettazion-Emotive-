import { SchedulerProvider } from "@/lib/crm-types";

export type CreateBookingLinkInput = {
  practiceId: string;
  practiceReference: string;
  appointmentType: "rilievo_locale";
};

export type CreateBookingLinkResult = {
  bookingUrl: string;
};

export interface SchedulerService {
  createBookingLink(input: CreateBookingLinkInput): Promise<CreateBookingLinkResult>;
}

class StubSchedulerService implements SchedulerService {
  constructor(private provider: SchedulerProvider) {}

  async createBookingLink(input: CreateBookingLinkInput): Promise<CreateBookingLinkResult> {
    const base = `https://scheduler.stub.local/${this.provider}/book`;
    const query = new URLSearchParams({
      practiceId: input.practiceId,
      reference: input.practiceReference,
      type: input.appointmentType,
    });
    return { bookingUrl: `${base}?${query.toString()}` };
  }
}

type CalComEventType = {
  slug: string;
  title?: string;
  length?: number;
  hidden?: boolean;
};

class CalComSchedulerService implements SchedulerService {
  private apiBase = process.env.CALCOM_API_BASE_URL || "https://api.cal.com";
  private apiKey = (process.env.CALCOM_API_KEY || "").trim();

  private desiredSlugByType: Record<CreateBookingLinkInput["appointmentType"], string> = {
    rilievo_locale: (process.env.CALCOM_EVENT_SLUG_RILIEVO || "30min").trim(),
  };

  private desiredTitleByType: Record<CreateBookingLinkInput["appointmentType"], string> = {
    rilievo_locale: (process.env.CALCOM_EVENT_TITLE_RILIEVO || "Meeting di 30 minuti").trim(),
  };

  private async fetchEventTypes() {
    if (!this.apiKey) {
      throw new Error("CALCOM_API_KEY mancante per integrazione Cal.com.");
    }

    const response = await fetch(`${this.apiBase}/v2/event-types`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Cal.com event-types failed (${response.status}): ${text.slice(0, 220)}`);
    }
    const json = JSON.parse(text);
    return json?.data || {};
  }

  async createBookingLink(input: CreateBookingLinkInput): Promise<CreateBookingLinkResult> {
    const data = await this.fetchEventTypes();
    const groups = Array.isArray(data.eventTypeGroups) ? data.eventTypeGroups : [];
    const firstGroup = groups[0];
    const profileSlug = firstGroup?.profile?.slug;
    const eventTypes: CalComEventType[] = Array.isArray(firstGroup?.eventTypes)
      ? firstGroup.eventTypes
      : [];

    if (!profileSlug || eventTypes.length === 0) {
      throw new Error("Cal.com: nessun profilo/event type disponibile.");
    }

    const wantedSlug = this.desiredSlugByType[input.appointmentType];
    const wantedTitle = this.desiredTitleByType[input.appointmentType];

    const selected =
      eventTypes.find((e) => e.slug === wantedSlug && !e.hidden) ||
      eventTypes.find((e) => (e.title || "").toLowerCase() === wantedTitle.toLowerCase() && !e.hidden) ||
      eventTypes.find((e) => !e.hidden) ||
      eventTypes[0];

    if (!selected?.slug) {
      throw new Error("Cal.com: impossibile determinare lo slug evento.");
    }

    const params = new URLSearchParams({
      utm_source: "crm_emotive",
      practice_ref: input.practiceReference,
      practice_id: input.practiceId,
    });

    return {
      bookingUrl: `https://cal.com/${profileSlug}/${selected.slug}?${params.toString()}`,
    };
  }
}

export function getSchedulerService(): SchedulerService {
  const raw = process.env.CRM_SCHEDULER_PROVIDER;
  const provider: SchedulerProvider = raw === "calcom" ? "calcom" : "calendly";
  if (provider === "calcom") {
    return new CalComSchedulerService();
  }
  return new StubSchedulerService(provider);
}
