export interface Driver {
  id: string;
  name: string;
  phone: string;
  isVerified: boolean;
}

export interface FareStructure {
  route: string;
  price: number;
  description?: string;
}

export interface ServiceInfo {
  name: string;
  operatingHours: string;
  description: string;
  vehicles: {
    type: string;
    count: number;
  }[];
}

export interface ERickshawService {
  service: ServiceInfo;
  drivers: Driver[];
  fares: FareStructure[];
}
