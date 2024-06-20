export interface EventRegister {
  _id: string;
  level: string;
  type: string;
  name: string;
  ownerName: string;
  ownerTel: string;
  color: string;
  birthday: string;
  gender: string;
  microchip: string;
  user: {
    _id: string;
    role: string;
  };
  buffaloImage: string;
  vaccineImage: string;
  event: {
    title: string;
    description: string;
    startAt: string;
    endAt: string;
    isActive: boolean;
  };
}
