export interface EventRegister {
  _id: string;
  level: string;
  type: string;
  name: string;
  ownerName: string;
  ownerTel: string;
  color: string;
  birthday: string;
  sex: string;
  microchip: string;
  motherName: string;
  fatherName: string;
  farmName: string;
  buffaloAge: number;
  user: {
    _id: string;
    role: string;
  };
  event: {
    _id: string;
    title: string;
    description: string;
    startAt: string;
    endAt: string;
    isActive: boolean;
    eventType?: string;
  };
  approvementResult: boolean | null;
  comment?: string;
}
