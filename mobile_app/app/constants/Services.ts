// constants/Services.ts

/* ==============================
   HOME SERVICE CATEGORIES
================================ */

export const SERVICE_CATEGORIES = [
  {
    id: 1,
    name: 'Plumbing',
    icon: '🔧',
    color: '#3498db',
    services: [
      'Leak Repair',
      'Pipe Fixing',
      'Toilet Repair',
      'Sink Installation',
      'Shower Repair',
      'Water Heater Repair',
    ],
  },
  {
    id: 2,
    name: 'Home Cleaning',
    icon: '🧹',
    color: '#2ecc71',
    services: [
      'General House Cleaning',
      'Kitchen Cleaning',
      'Bathroom Cleaning',
      'Carpet Cleaning',
      'Move-in / Move-out Cleaning',
    ],
  },
  {
    id: 3,
    name: 'Electrical Services',
    icon: '⚡',
    color: '#f39c12',
    services: [
      'Home Wiring Repair',
      'Socket & Switch Repair',
      'Light Installation',
      'Power Failure Fix',
      'Appliance Electrical Repair',
    ],
  },
  {
    id: 4,
    name: 'Internet & TV Setup',
    icon: '📡',
    color: '#9b59b6',
    services: [
      'Wi-Fi Router Setup',
      'TV Installation',
      'Cable Management',
      'Signal Troubleshooting',
    ],
  },
  {
    id: 5,
    name: 'Painting & Finishing',
    icon: '🎨',
    color: '#e74c3c',
    services: [
      'Interior Wall Painting',
      'Room Painting',
      'Ceiling Painting',
      'Wall Repair & Painting',
    ],
  },
  {
    id: 6,
    name: 'Carpentry',
    icon: '🪚',
    color: '#1abc9c',
    services: [
      'Furniture Repair',
      'Door Repair',
      'Window Repair',
      'Cabinet Installation',
      'Bed & Sofa Fixing',
    ],
  },
  {
    id: 7,
    name: 'AC & Home Appliances',
    icon: '❄️',
    color: '#34495e',
    services: [
      'AC Installation',
      'AC Repair',
      'AC Maintenance',
      'Refrigerator Repair',
      'Washing Machine Repair',
    ],
  },
  {
    id: 8,
    name: 'Home Maintenance',
    icon: '🏠',
    color: '#16a085',
    services: [
      'General Home Maintenance',
      'Lock Repair',
      'Glass & Window Repair',
      'Curtain Rod Installation',
      'Minor Home Fixes',
    ],
  },
] as const;

// Alias SERVICE_CATEGORIES as SERVICES for backward compatibility
export const SERVICES = SERVICE_CATEGORIES;

/* ==============================
   BANKS
================================ */

export const BANKS = [
  'Commercial Bank of Ethiopia',
  'Awash Bank',
  'Dashen Bank',
  'Bank of Abyssinia',
  'Nib International Bank',
  'Cooperative Bank of Oromia',
  'United Bank',
  'Oromia International Bank',
  'Enat Bank',
  'Zemen Bank',
  'Lion International Bank',
] as const;

/* ==============================
   LOCATIONS
================================ */

export const LOCATIONS = [
  'Addis Ababa',
  'Bahirdar',
  'Jimma',
  'Adama',
  'Hawassa',
  'Mekelle',
  'Gondar',
  'Dire Dawa',
  'Adwa',
  'Axum',
  'Lalibela',
  'Debre Markos',
  'Debre Birhan',
  'Shashamane',
  'Arba Minch',
  'Jijiga',
  'Harar',
  'Nekemte',
  'Assosa',
  'Gambela',
] as const;

/* ==============================
   TYPES (IMPORTANT)
================================ */

export type LocationType = (typeof LOCATIONS)[number];
export type BankType = (typeof BANKS)[number];

export type ServiceCategoryType = (typeof SERVICE_CATEGORIES)[number];

// Create ServiceType alias for ServiceCategoryType for backward compatibility
export type ServiceType = ServiceCategoryType;

export type ServiceNameType = (typeof SERVICE_CATEGORIES)[number]['services'][number];