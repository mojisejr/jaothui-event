export interface Event {
  eventId: string;
  imageUrl: string;
  name: string;
  eventAt: string;
  isActive?: boolean;
  metadata: string[] | null;
}
