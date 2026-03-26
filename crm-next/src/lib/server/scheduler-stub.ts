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

export function getSchedulerService(): SchedulerService {
  const raw = process.env.CRM_SCHEDULER_PROVIDER;
  const provider: SchedulerProvider = raw === "calcom" ? "calcom" : "calendly";
  return new StubSchedulerService(provider);
}
