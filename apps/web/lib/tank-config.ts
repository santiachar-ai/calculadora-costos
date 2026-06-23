export type TankDefinition = {
  code: string;
  name: string;
  capacityLiters: number;
  baseProductName: string;
  commercialNames?: string[];
  notes?: string;
};

export const tankDefinitions: TankDefinition[] = [
  {
    code: "TQ-01",
    name: "Tanque 1",
    capacityLiters: 20000,
    baseProductName: "Solucion Urea Industrial",
  },
  {
    code: "TQ-02",
    name: "Tanque 2",
    capacityLiters: 15000,
    baseProductName: "Solucion Urea Industrial",
  },
  {
    code: "TQ-03",
    name: "Tanque 3",
    capacityLiters: 20000,
    baseProductName: "Solucion urea 32,5",
    commercialNames: [
      "Solucion urea 32,5",
      "OPTI-BLUE Solucion de urea al 32,5",
    ],
  },
  {
    code: "TQ-04",
    name: "Tanque 4",
    capacityLiters: 12000,
    baseProductName: "Solucion urea 32,5",
    commercialNames: [
      "Solucion urea 32,5",
      "OPTI-BLUE Solucion de urea al 32,5",
    ],
  },
  {
    code: "TQ-05",
    name: "Tanque 5",
    capacityLiters: 25000,
    baseProductName: "Solucion Urea Industrial",
  },
  {
    code: "TQ-06",
    name: "Tanque 6",
    capacityLiters: 15000,
    baseProductName: "Solucion urea 32,5",
    commercialNames: [
      "Solucion urea 32,5",
      "OPTI-BLUE Solucion de urea al 32,5",
    ],
  },
  {
    code: "TQ-07",
    name: "Tanque 7",
    capacityLiters: 10000,
    baseProductName: "Urkem urea automotor liquida",
  },
  {
    code: "TQ-08",
    name: "Tanque 8",
    capacityLiters: 18000,
    baseProductName: "Solucion urea 32,5",
    commercialNames: [
      "Solucion urea 32,5",
      "OPTI-BLUE Solucion de urea al 32,5",
    ],
  },
];
