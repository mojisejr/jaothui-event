export interface CreateNewEventRegisterDTO {
  eventId: string;
  userId: string;
  type: string;
  level: string;
  name: string;
  gender: string;
  color: string;
  birthday: string;
  imageUrl?: string;
  microchip: string;
  vaccineUrl?: string;
  ownerName: string;
  ownerTel: string;
}
