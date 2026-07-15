import { z } from 'zod';

export const LOCATION_CATEGORIES = [
  'academic',
  'department',
  'hostel',
  'food',
  'banking',
  'health',
  'sports',
  'office',
  'gate',
  'service',
  'landmark',
] as const;

export type LocationCategory = (typeof LOCATION_CATEGORIES)[number];

export const locationCategorySchema = z.enum(LOCATION_CATEGORIES);

export const campusLocationSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    category: locationCategorySchema,
    lat: z.number().optional(),
    lng: z.number().optional(),
    address: z.string().optional(),
    plusCode: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    website: z.string().optional(),
    description: z.string().optional(),
    aliases: z.array(z.string()).optional(),
  })
  .superRefine((loc, ctx) => {
    if ((loc.lat != null && loc.lng != null) || !!loc.plusCode) return;
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `"${loc.name || loc.id}" needs coordinates (lat/lng) or a Plus Code`,
      path: ['plusCode'],
    });
  });

export const mapPutSchema = z.object({
  campusId: z.string().min(1),
  locations: z.array(campusLocationSchema),
});

export type CampusLocation = z.infer<typeof campusLocationSchema>;
export type MapLocationsDoc = z.infer<typeof mapPutSchema>;

/**
 * Default seed used by API fallback/seed script and mobile offline merge —
 * same offline-first pattern as Laundry/Wi-Fi/E-Rickshaw. Curated directory
 * of ~95 IIT Jodhpur campus locations with Plus Codes and common aliases.
 */
export const DEFAULT_CAMPUS_LOCATIONS: CampusLocation[] = [
  // Gates
  { id: 'gate-001', name: 'IIT Gate No.1', category: 'gate', address: 'Jheepasani, Rajasthan 342030', plusCode: 'F488+M48', lat: 26.47, lng: 73.12, aliases: ['Main Gate', 'Front Gate', 'Gate 1'] },
  { id: 'gate-002', name: 'IIT Side Gate / NIFT Gate', category: 'gate', address: 'Jheepasani, Rajasthan 342030', plusCode: 'F456+V3M', lat: 26.47, lng: 73.11, aliases: ['Side Gate', 'NIFT Gate', 'Gate 2'] },

  // Academic Buildings
  { id: 'academic-001', name: 'Administrative Block', category: 'academic', plusCode: 'F4C7+9GM' },
  { id: 'academic-002', name: 'Computer Center', category: 'academic', plusCode: 'F4C7+JH5' },
  { id: 'academic-003', name: 'S. R. Ranganathan Learning Hub', category: 'academic', description: 'Central Library', plusCode: 'F4C7+J99', aliases: ['Library', 'Central Library', 'Learning Hub', 'SRRL', 'S R Ranganathan'] },
  { id: 'academic-004', name: 'Lecture Hall Complex 1', category: 'academic', plusCode: 'F4F7+5J', aliases: ['LHC', 'LHC1', 'Lecture Hall Complex 1', 'Lecture Hall'] },
  { id: 'academic-005', name: 'Lecture Hall Complex 2', category: 'academic', description: 'New Academic Building', plusCode: 'F4J8+27H', aliases: ['LHC2', 'Lecture Hall Complex 2', 'New Building'] },
  { id: 'academic-006', name: 'Basic Laboratories', category: 'academic', plusCode: 'F4F8+X2J' },
  { id: 'academic-007', name: 'CASE', category: 'academic', description: 'Centre for Advanced Scientific Equipment', plusCode: 'F4G7+FJX', aliases: ['CASE', 'Centre for Advanced Scientific Equipment'] },
  { id: 'academic-008', name: 'CBSA', category: 'academic', description: 'Centre for Brain Science & Applications', plusCode: 'F4F6+598', aliases: ['CBSA', 'Brain Science', 'Neuroscience'] },
  { id: 'academic-009', name: 'CETSD', category: 'academic', plusCode: 'F4F9+84' },
  { id: 'academic-010', name: 'Dr. C. R. Rao Bhawan', category: 'academic', plusCode: 'F4J8+23M' },
  { id: 'academic-011', name: 'School of Design', category: 'academic', plusCode: 'F466+C8V', aliases: ['Design School', 'Design Center'] },
  { id: 'academic-012', name: 'School of Management & Entrepreneurship', category: 'academic', plusCode: 'F4J8+2V', aliases: ['Management School', 'SME', 'Entrepreneurship'] },
  { id: 'academic-013', name: 'School of Liberal Arts', category: 'academic', plusCode: 'F4J8+4J7', aliases: ['Liberal Arts', 'SOLA', 'Humanities'] },
  { id: 'academic-014', name: 'Technology Innovation & Start-up Center', category: 'academic', description: 'IITJ-TISC', plusCode: 'F4C6+6W4', aliases: ['TISC', 'Startup Center', 'Innovation Hub'] },
  { id: 'academic-015', name: 'DRDO Industry-Academia Centre of Excellence', category: 'academic', plusCode: 'F4C6+6W4' },
  { id: 'academic-016', name: 'JCKIF', category: 'academic', description: 'Jodhpur City Knowledge & Innovation Foundation', plusCode: 'F4C8+6C' },
  { id: 'academic-017', name: 'CoE AyurTech', category: 'academic', description: 'Centre of Excellence in Ayurvedic Technology', plusCode: 'F4F5+FXR', aliases: ['AyurTech', 'Ayurveda', 'Ayurvedic Technology'] },
  { id: 'academic-018', name: 'MedTech', category: 'academic', description: 'Centre of Excellence in Medical Technology', plusCode: 'F4F5+JX9', aliases: ['MedTech', 'Medical Technology'] },
  { id: 'academic-019', name: "Anand Rathi Tinkerers' Lab", category: 'academic', lat: 26.474100483379512, lng: 73.11790654409437 },

  // Departments
  { id: 'dept-001', name: 'Computer Science & Engineering', category: 'department', plusCode: 'F4F7+XQF', aliases: ['CSE', 'CS', 'Computer Science'] },
  { id: 'dept-002', name: 'Electrical Engineering', category: 'department', plusCode: 'F4H8+MCP', aliases: ['EE', 'Electrical', 'Electrical Engg'] },
  { id: 'dept-003', name: 'Mechanical Engineering', category: 'department', plusCode: 'F4H8+JJ', aliases: ['ME', 'Mechanical', 'Mechanical Engg'] },
  { id: 'dept-004', name: 'Civil & Infrastructure Engineering', category: 'department', plusCode: 'F4H8+FHC', aliases: ['CE', 'Civil', 'Civil Engg', 'Infrastructure'] },
  { id: 'dept-005', name: 'Chemistry', category: 'department', plusCode: 'F4G8+527', aliases: ['Chem', 'Chemistry Department'] },
  { id: 'dept-006', name: 'Physics', category: 'department', plusCode: 'F4H8+WF5', aliases: ['Physics Department', 'Phys'] },
  { id: 'dept-007', name: 'Mathematics', category: 'department', plusCode: 'F4J8+59F', aliases: ['Math', 'Mathematics Department'] },
  { id: 'dept-008', name: 'Metallurgical & Materials Engineering', category: 'department', plusCode: 'F4H8+RQX' },
  { id: 'dept-009', name: 'Bioscience & Bioengineering', category: 'department', plusCode: 'F4G7+6RH' },

  // Hostels - Boys
  { id: 'hostel-b1', name: 'B1 Hostel', category: 'hostel', plusCode: 'F4F8+352', aliases: ['B1', 'Boy Hostel 1'] },
  { id: 'hostel-b3', name: 'B3 Hostel', category: 'hostel', plusCode: 'F4C8+XVF', aliases: ['B3', 'Boy Hostel 3'] },
  { id: 'hostel-b5', name: 'B5 Hostel', category: 'hostel', description: 'Neelkantha', plusCode: 'F4C8+V2' },
  { id: 'hostel-g1', name: 'G1 Hostel', category: 'hostel', plusCode: 'F4F8+8CJ', aliases: ['G1', 'Boys Hostel'] },
  { id: 'hostel-g2', name: 'G2 Hostel', category: 'hostel', lat: 26.47343482517924, lng: 73.11650680016157, aliases: ['G2', 'Hostel G2'] },
  { id: 'hostel-g3', name: 'G3 Hostel', category: 'hostel', lat: 26.473435155883493, lng: 73.11729773769963 },
  { id: 'hostel-g5', name: 'G5 Hostel', category: 'hostel', lat: 26.47329792482051, lng: 73.11558549249843 },
  { id: 'hostel-g6', name: 'G6 Hostel', category: 'hostel' },
  { id: 'hostel-o3', name: 'O3 Hostel', category: 'hostel', plusCode: 'F4G9+F56' },
  { id: 'hostel-o4', name: 'O4 Hostel', category: 'hostel', description: 'Rohida', lat: 26.475183482650436, lng: 73.11710534419657 },
  { id: 'hostel-y3', name: 'Y3 Hostel', category: 'hostel', description: 'Amaltas', lat: 26.474273271789805, lng: 73.11732566109791 },
  { id: 'hostel-y4', name: 'Y4 Hostel', category: 'hostel', description: 'Gulmohar', plusCode: 'F4F8+JQ', aliases: ['Y4', 'Gulmohar Hostel'] },

  // Hostels - Girls
  { id: 'hostel-b2', name: 'B2 Hostel', category: 'hostel', description: 'Girls Hostel', plusCode: 'F4F8+2PP', aliases: ['B2', 'Girl Hostel 2'] },
  { id: 'hostel-b4', name: 'B4 Hostel', category: 'hostel', description: 'Girls Hostel', plusCode: 'F4C8+WG', aliases: ['B4', 'Girl Hostel 4'] },
  { id: 'hostel-g4', name: 'G4 Hostel', category: 'hostel', description: 'Girls Hostel' },
  { id: 'hostel-i2', name: 'I2 Girls Hostel', category: 'hostel', plusCode: 'F4C8+M3', aliases: ['I2', 'Girls Hostel'] },
  { id: 'hostel-i3', name: 'I3 Girls Hostel', category: 'hostel', plusCode: 'F4C8+JF', aliases: ['I3', 'Girls Hostel I3'] },

  // Food & Cafés
  { id: 'food-001', name: 'Fresh N Green', category: 'food', plusCode: 'F486+GQ2' },
  { id: 'food-002', name: 'Neem Cafe', category: 'food', plusCode: 'F486+FQC' },
  { id: 'food-003', name: 'Shamiyana', category: 'food', plusCode: 'F4G7+PM' },
  { id: 'food-004', name: "Domino's", category: 'food', plusCode: 'F4G7+QP' },
  { id: 'food-005', name: 'Pan Chai Tea', category: 'food', plusCode: 'F4F7+5JC' },
  { id: 'food-006', name: "Jeetu's Cafe", category: 'food', description: 'SME Tapri', plusCode: 'F4J8+4J7' },
  { id: 'food-007', name: 'Tea Point', category: 'food', description: 'Sri Hari Snacks & Juice Corner', plusCode: 'F4F7+4W' },
  { id: 'food-008', name: 'Old Mess', category: 'food', plusCode: 'F4C8+VQM', aliases: ['Old Mess', 'Mess', 'Food Court'] },
  { id: 'food-009', name: 'New Veg Mess', category: 'food', plusCode: 'F4F8+4XM', aliases: ['New Mess', 'Veg Mess'] },

  // Banking
  { id: 'banking-001', name: 'SBI ATM', category: 'banking', plusCode: 'F4G6+964', aliases: ['SBI', 'Bank ATM', 'ATM'] },
  { id: 'banking-002', name: 'HDFC ATM', category: 'banking', plusCode: 'F4G6+964' },

  // Health
  { id: 'health-001', name: 'Health Centre', category: 'health', description: 'Primary Health Centre (PHC)', plusCode: 'F4J9+9RG', phone: '+91-291-2801079', aliases: ['Medical', 'Health Centre', 'Clinic', 'Hospital', 'PHC', 'Doctor'] },

  // Sports
  { id: 'sports-001', name: 'Sports Club', category: 'sports', plusCode: 'F4G9+PR4', aliases: ['Gym', 'Sports Complex', 'Fitness'] },
  { id: 'sports-002', name: 'Cricket Ground', category: 'sports', plusCode: 'F4HF+93V', lat: 26.475607326300473, lng: 73.12011875853503, aliases: ['Cricket', 'Cricket Ground', 'Cricket Pitch'] },
  { id: 'sports-003', name: 'Football Ground', category: 'sports', lat: 26.475607326300473, lng: 73.12011875853503, aliases: ['Football', 'Football Ground', 'Soccer'] },
  { id: 'sports-004', name: 'Hockey Ground', category: 'sports', plusCode: 'F4F9+FR6', aliases: ['Hockey', 'Hockey Ground'] },
  { id: 'sports-005', name: 'Running Track', category: 'sports', description: 'Synthetic Running Track', plusCode: 'F4GC+F64', aliases: ['Track', 'Running Track', 'Athletic Track'] },
  { id: 'sports-006', name: 'Basketball Courts', category: 'sports', plusCode: 'F4GC+JF', aliases: ['Basketball', 'Basketball Court'] },
  { id: 'sports-007', name: 'Lawn Tennis Courts', category: 'sports', plusCode: 'F4GC+QFM', aliases: ['Tennis', 'Tennis Court', 'Lawn Tennis'] },
  { id: 'sports-008', name: 'Volleyball Court', category: 'sports', plusCode: 'F4GC+XM7' },
  { id: 'sports-009', name: 'Badminton Complex', category: 'sports', plusCode: 'F4G9+PR4' },

  // Administrative Offices
  { id: 'office-001', name: 'Office of Director', category: 'office', plusCode: 'F4C7+F64', aliases: ['Director', "Director's Office"] },
  { id: 'office-002', name: 'Office of Academics', category: 'office', plusCode: 'F4C7+HGH', aliases: ['Academics', 'Academic Office'] },
  { id: 'office-003', name: 'Office of R&D', category: 'office', plusCode: 'F4C7+HGH', aliases: ['R&D', 'Research Office'] },
  { id: 'office-004', name: 'W1 Security & ID Card Office', category: 'office', plusCode: 'F4C6+4XW' },

  // Campus Services
  { id: 'service-001', name: 'Laundry Service', category: 'service', plusCode: 'F4G9+F5', aliases: ['Laundry', 'Washing'] },
  { id: 'service-002', name: 'Shree Balaji Saloon', category: 'service', plusCode: 'F4G9+F56', aliases: ['Salon', 'Barber', 'Hair Cut'] },
  { id: 'service-003', name: 'Visitor Quarters', category: 'service', plusCode: 'F4G7+R8R' },
  { id: 'service-004', name: 'Faculty Quarters', category: 'service', plusCode: 'F4F6+HH' },
  { id: 'service-005', name: 'Type C Quarters', category: 'service', plusCode: 'F486+PW4' },

  // Landmarks
  { id: 'landmark-001', name: 'Knowledge Tree', category: 'landmark', plusCode: 'F497+PM3', aliases: ['Tree', 'Knowledge Tree'] },
  { id: 'landmark-002', name: 'IITJ Fountain', category: 'landmark', plusCode: 'F4C7+5F', aliases: ['Fountain', 'Water Fountain'] },
  { id: 'landmark-003', name: 'I2 Informal Ground', category: 'landmark', plusCode: 'F4C7+JWX' },
  { id: 'landmark-004', name: 'Balaji & Shiv Temple', category: 'landmark', plusCode: 'F4PF+66W' },
  { id: 'landmark-005', name: 'National Flag', category: 'landmark', plusCode: 'F4G9+PRP' },
];

export const holidaySchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  description: z.string().optional(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const holidaysPutSchema = z.object({
  campusId: z.string().min(1),
  holidays: z.array(holidaySchema),
});

export type Holiday = z.infer<typeof holidaySchema>;
export type HolidaysDoc = z.infer<typeof holidaysPutSchema>;
