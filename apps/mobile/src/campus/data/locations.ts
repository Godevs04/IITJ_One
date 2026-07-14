import type { CampusLocation } from '../types';

/**
 * Comprehensive IIT Jodhpur campus locations directory.
 * Organized by category with coordinates and Plus Codes.
 * Ready for future Admin Panel integration without UI changes.
 */
export const CAMPUS_LOCATIONS: CampusLocation[] = [
  // Gates
  {
    id: 'gate-001',
    name: 'IIT Gate No.1',
    category: 'gate',
    address: 'Jheepasani, Rajasthan 342030',
    plusCode: 'F488+M48',
    latitude: 26.47,
    longitude: 73.12,
  },
  {
    id: 'gate-002',
    name: 'IIT Side Gate / NIFT Gate',
    category: 'gate',
    address: 'Jheepasani, Rajasthan 342030',
    plusCode: 'F456+V3M',
    latitude: 26.47,
    longitude: 73.11,
  },

  // Academic Buildings
  {
    id: 'academic-001',
    name: 'Administrative Block',
    category: 'academic',
    plusCode: 'F4C7+9GM',
  },
  {
    id: 'academic-002',
    name: 'Computer Center',
    category: 'academic',
    plusCode: 'F4C7+JH5',
  },
  {
    id: 'academic-003',
    name: 'S. R. Ranganathan Learning Hub',
    category: 'academic',
    description: 'Central Library',
    plusCode: 'F4C7+J99',
  },
  {
    id: 'academic-004',
    name: 'Lecture Hall Complex 1',
    category: 'academic',
    plusCode: 'F4F7+5J',
  },
  {
    id: 'academic-005',
    name: 'Lecture Hall Complex 2',
    category: 'academic',
    description: 'New Academic Building',
    plusCode: 'F4J8+27H',
  },
  {
    id: 'academic-006',
    name: 'Basic Laboratories',
    category: 'academic',
    plusCode: 'F4F8+X2J',
  },
  {
    id: 'academic-007',
    name: 'CASE',
    category: 'academic',
    description: 'Centre for Advanced Scientific Equipment',
    plusCode: 'F4G7+FJX',
  },
  {
    id: 'academic-008',
    name: 'CBSA',
    category: 'academic',
    description: 'Centre for Brain Science & Applications',
    plusCode: 'F4F6+598',
  },
  {
    id: 'academic-009',
    name: 'CETSD',
    category: 'academic',
    plusCode: 'F4F9+84',
  },
  {
    id: 'academic-010',
    name: 'Dr. C. R. Rao Bhawan',
    category: 'academic',
    plusCode: 'F4J8+23M',
  },
  {
    id: 'academic-011',
    name: 'School of Design',
    category: 'academic',
    plusCode: 'F466+C8V',
  },
  {
    id: 'academic-012',
    name: 'School of Management & Entrepreneurship',
    category: 'academic',
    plusCode: 'F4J8+2V',
  },
  {
    id: 'academic-013',
    name: 'School of Liberal Arts',
    category: 'academic',
    plusCode: 'F4J8+4J7',
  },
  {
    id: 'academic-014',
    name: 'Technology Innovation & Start-up Center',
    category: 'academic',
    description: 'IITJ-TISC',
    plusCode: 'F4C6+6W4',
  },
  {
    id: 'academic-015',
    name: 'DRDO Industry-Academia Centre of Excellence',
    category: 'academic',
    plusCode: 'F4C6+6W4',
  },
  {
    id: 'academic-016',
    name: 'JCKIF',
    category: 'academic',
    description: 'Jodhpur City Knowledge & Innovation Foundation',
    plusCode: 'F4C8+6C',
  },
  {
    id: 'academic-017',
    name: 'CoE AyurTech',
    category: 'academic',
    description: 'Centre of Excellence in Ayurvedic Technology',
    plusCode: 'F4F5+FXR',
  },
  {
    id: 'academic-018',
    name: 'MedTech',
    category: 'academic',
    description: 'Centre of Excellence in Medical Technology',
    plusCode: 'F4F5+JX9',
  },
  {
    id: 'academic-019',
    name: 'Anand Rathi Tinkerers\' Lab',
    category: 'academic',
    latitude: 26.474100483379512,
    longitude: 73.11790654409437,
  },

  // Departments
  {
    id: 'dept-001',
    name: 'Computer Science & Engineering',
    category: 'department',
    plusCode: 'F4F7+XQF',
  },
  {
    id: 'dept-002',
    name: 'Electrical Engineering',
    category: 'department',
    plusCode: 'F4H8+MCP',
  },
  {
    id: 'dept-003',
    name: 'Mechanical Engineering',
    category: 'department',
    plusCode: 'F4H8+JJ',
  },
  {
    id: 'dept-004',
    name: 'Civil & Infrastructure Engineering',
    category: 'department',
    plusCode: 'F4H8+FHC',
  },
  {
    id: 'dept-005',
    name: 'Chemistry',
    category: 'department',
    plusCode: 'F4G8+527',
  },
  {
    id: 'dept-006',
    name: 'Physics',
    category: 'department',
    plusCode: 'F4H8+WF5',
  },
  {
    id: 'dept-007',
    name: 'Mathematics',
    category: 'department',
    plusCode: 'F4J8+59F',
  },
  {
    id: 'dept-008',
    name: 'Metallurgical & Materials Engineering',
    category: 'department',
    plusCode: 'F4H8+RQX',
  },
  {
    id: 'dept-009',
    name: 'Bioscience & Bioengineering',
    category: 'department',
    plusCode: 'F4G7+6RH',
  },

  // Hostels - Boys
  {
    id: 'hostel-b1',
    name: 'B1 Hostel',
    category: 'hostel',
    plusCode: 'F4F8+352',
  },
  {
    id: 'hostel-b3',
    name: 'B3 Hostel',
    category: 'hostel',
    plusCode: 'F4C8+XVF',
  },
  {
    id: 'hostel-b5',
    name: 'B5 Hostel',
    category: 'hostel',
    description: 'Neelkantha',
    plusCode: 'F4C8+V2',
  },
  {
    id: 'hostel-g1',
    name: 'G1 Hostel',
    category: 'hostel',
    plusCode: 'F4F8+8CJ',
  },
  {
    id: 'hostel-g2',
    name: 'G2 Hostel',
    category: 'hostel',
    latitude: 26.47343482517924,
    longitude: 73.11650680016157,
  },
  {
    id: 'hostel-g3',
    name: 'G3 Hostel',
    category: 'hostel',
    latitude: 26.473435155883493,
    longitude: 73.11729773769963,
  },
  {
    id: 'hostel-g5',
    name: 'G5 Hostel',
    category: 'hostel',
    latitude: 26.47329792482051,
    longitude: 73.11558549249843,
  },
  {
    id: 'hostel-g6',
    name: 'G6 Hostel',
    category: 'hostel',
  },
  {
    id: 'hostel-o3',
    name: 'O3 Hostel',
    category: 'hostel',
    plusCode: 'F4G9+F56',
  },
  {
    id: 'hostel-o4',
    name: 'O4 Hostel',
    category: 'hostel',
    description: 'Rohida',
    latitude: 26.475183482650436,
    longitude: 73.11710534419657,
  },
  {
    id: 'hostel-y3',
    name: 'Y3 Hostel',
    category: 'hostel',
    description: 'Amaltas',
    latitude: 26.474273271789805,
    longitude: 73.11732566109791,
  },
  {
    id: 'hostel-y4',
    name: 'Y4 Hostel',
    category: 'hostel',
    description: 'Gulmohar',
    plusCode: 'F4F8+JQ',
  },

  // Hostels - Girls
  {
    id: 'hostel-b2',
    name: 'B2 Hostel',
    category: 'hostel',
    description: 'Girls Hostel',
    plusCode: 'F4F8+2PP',
  },
  {
    id: 'hostel-b4',
    name: 'B4 Hostel',
    category: 'hostel',
    description: 'Girls Hostel',
    plusCode: 'F4C8+WG',
  },
  {
    id: 'hostel-g4',
    name: 'G4 Hostel',
    category: 'hostel',
    description: 'Girls Hostel',
  },
  {
    id: 'hostel-i2',
    name: 'I2 Girls Hostel',
    category: 'hostel',
    plusCode: 'F4C8+M3',
  },
  {
    id: 'hostel-i3',
    name: 'I3 Girls Hostel',
    category: 'hostel',
    plusCode: 'F4C8+JF',
  },

  // Food & Cafés
  {
    id: 'food-001',
    name: 'Fresh N Green',
    category: 'food',
    plusCode: 'F486+GQ2',
  },
  {
    id: 'food-002',
    name: 'Neem Cafe',
    category: 'food',
    plusCode: 'F486+FQC',
  },
  {
    id: 'food-003',
    name: 'Shamiyana',
    category: 'food',
    plusCode: 'F4G7+PM',
  },
  {
    id: 'food-004',
    name: 'Domino\'s',
    category: 'food',
    plusCode: 'F4G7+QP',
  },
  {
    id: 'food-005',
    name: 'Pan Chai Tea',
    category: 'food',
    plusCode: 'F4F7+5JC',
  },
  {
    id: 'food-006',
    name: 'Jeetu\'s Cafe',
    category: 'food',
    description: 'SME Tapri',
    plusCode: 'F4J8+4J7',
  },
  {
    id: 'food-007',
    name: 'Tea Point',
    category: 'food',
    description: 'Sri Hari Snacks & Juice Corner',
    plusCode: 'F4F7+4W',
  },
  {
    id: 'food-008',
    name: 'Old Mess',
    category: 'food',
    plusCode: 'F4C8+VQM',
  },
  {
    id: 'food-009',
    name: 'New Veg Mess',
    category: 'food',
    plusCode: 'F4F8+4XM',
  },

  // Banking
  {
    id: 'banking-001',
    name: 'SBI ATM',
    category: 'banking',
    plusCode: 'F4G6+964',
  },
  {
    id: 'banking-002',
    name: 'HDFC ATM',
    category: 'banking',
    plusCode: 'F4G6+964',
  },

  // Health
  {
    id: 'health-001',
    name: 'Health Centre',
    category: 'health',
    description: 'Primary Health Centre (PHC)',
    plusCode: 'F4J9+9RG',
    phone: '+91-291-2801079',
  },

  // Sports
  {
    id: 'sports-001',
    name: 'Sports Club',
    category: 'sports',
    plusCode: 'F4G9+PR4',
  },
  {
    id: 'sports-002',
    name: 'Cricket Ground',
    category: 'sports',
    plusCode: 'F4HF+93V',
    latitude: 26.475607326300473,
    longitude: 73.12011875853503,
  },
  {
    id: 'sports-003',
    name: 'Football Ground',
    category: 'sports',
    latitude: 26.475607326300473,
    longitude: 73.12011875853503,
  },
  {
    id: 'sports-004',
    name: 'Hockey Ground',
    category: 'sports',
    plusCode: 'F4F9+FR6',
  },
  {
    id: 'sports-005',
    name: 'Running Track',
    category: 'sports',
    description: 'Synthetic Running Track',
    plusCode: 'F4GC+F64',
  },
  {
    id: 'sports-006',
    name: 'Basketball Courts',
    category: 'sports',
    plusCode: 'F4GC+JF',
  },
  {
    id: 'sports-007',
    name: 'Lawn Tennis Courts',
    category: 'sports',
    plusCode: 'F4GC+QFM',
  },
  {
    id: 'sports-008',
    name: 'Volleyball Court',
    category: 'sports',
    plusCode: 'F4GC+XM7',
  },
  {
    id: 'sports-009',
    name: 'Badminton Complex',
    category: 'sports',
    plusCode: 'F4G9+PR4',
  },

  // Administrative Offices
  {
    id: 'office-001',
    name: 'Office of Director',
    category: 'office',
    plusCode: 'F4C7+F64',
  },
  {
    id: 'office-002',
    name: 'Office of Academics',
    category: 'office',
    plusCode: 'F4C7+HGH',
  },
  {
    id: 'office-003',
    name: 'Office of R&D',
    category: 'office',
    plusCode: 'F4C7+HGH',
  },
  {
    id: 'office-004',
    name: 'W1 Security & ID Card Office',
    category: 'office',
    plusCode: 'F4C6+4XW',
  },

  // Campus Services
  {
    id: 'service-001',
    name: 'Laundry Service',
    category: 'service',
    plusCode: 'F4G9+F5',
  },
  {
    id: 'service-002',
    name: 'Shree Balaji Saloon',
    category: 'service',
    plusCode: 'F4G9+F56',
  },
  {
    id: 'service-003',
    name: 'Visitor Quarters',
    category: 'service',
    plusCode: 'F4G7+R8R',
  },
  {
    id: 'service-004',
    name: 'Faculty Quarters',
    category: 'service',
    plusCode: 'F4F6+HH',
  },
  {
    id: 'service-005',
    name: 'Type C Quarters',
    category: 'service',
    plusCode: 'F486+PW4',
  },

  // Landmarks
  {
    id: 'landmark-001',
    name: 'Knowledge Tree',
    category: 'landmark',
    plusCode: 'F497+PM3',
  },
  {
    id: 'landmark-002',
    name: 'IITJ Fountain',
    category: 'landmark',
    plusCode: 'F4C7+5F',
  },
  {
    id: 'landmark-003',
    name: 'I2 Informal Ground',
    category: 'landmark',
    plusCode: 'F4C7+JWX',
  },
  {
    id: 'landmark-004',
    name: 'Balaji & Shiv Temple',
    category: 'landmark',
    plusCode: 'F4PF+66W',
  },
  {
    id: 'landmark-005',
    name: 'National Flag',
    category: 'landmark',
    plusCode: 'F4G9+PRP',
  },
];
