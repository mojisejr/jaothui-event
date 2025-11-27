export interface Event {
  eventId: string;
  imageUrl: string;
  name: string;
  eventAt: string;
  endAt: string;
  deadline: string;
  isActive?: boolean;
  registrationActive?: boolean;
  registrationStartAt?: string;
  registrationDeadline?: string;
  metadata: string[] | null;
  eventType?: "normal" | "royal";
}
