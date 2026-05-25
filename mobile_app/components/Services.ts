
// constants/Services.ts - CORRECTED VERSION
export const SERVICE_DETAILS = [
  { id: 1, name: 'Plumbing', icon: '🔧', color: '#3498db' },
  { id: 2, name: 'Cleaning', icon: '🧹', color: '#2ecc71' },
  { id: 3, name: 'Electrical Repair', icon: '⚡', color: '#f39c12' },
  { id: 4, name: 'Cable Installation', icon: '🔌', color: '#9b59b6' },
  { id: 5, name: 'Painting', icon: '🎨', color: '#e74c3c' },
  { id: 6, name: 'Carpentry', icon: '🪚', color: '#1abc9c' },
  { id: 7, name: 'AC Repair', icon: '❄️', color: '#34495e' },
  { id: 8, name: 'Home Maintenance', icon: '🏠', color: '#16a085' },
] as const;

// Use SERVICE_DETAILS as the main SERVICES array
export const SERVICES = SERVICE_DETAILS;

// For backward compatibility
export const SERVICE_NAMES = SERVICE_DETAILS.map(service => service.name);

export const BANKS = [
  'Commercial Bank of Ethiopia',
  'Awash Bank',
  'Dashen Bank',
  'Abyssinia Bank',
  'Bank of Abyssinia',
  'Nib International Bank',
  'Cooperative Bank of Oromia',
  'United Bank',
  'Oromia International Bank',
  'Enat Bank',
  'Zemen Bank',
  'Lion International Bank',
] as const;

// Types
export type ServiceDetailType = typeof SERVICE_DETAILS[number];
export type ServiceType = ServiceDetailType; // Alias for backward compatibility
export type BankType = typeof BANKS[number];
// Fix Leaflet icons not showing

