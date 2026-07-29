import { z } from 'zod';

export const contactSchema = z.object({
  label: z.string().min(1),
  phone: z.string().min(1),
});

export const medicalOfficerSchema = z.object({
  name: z.string().min(1),
  designation: z.string().optional(),
});

export const hospitalSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  phone: z.string().optional(),
});

/**
 * `specialty` is the only field guaranteed present — it's all the static fallback list (scraped
 * from the main page's prose, or the seed) ever has. `doctorName`/`qualification`/`room`/`timing`
 * are populated only when this entry came from an actual per-day worksheet row.
 */
export const visitingSpecialistSchema = z.object({
  specialty: z.string().min(1),
  doctorName: z.string().optional(),
  qualification: z.string().optional(),
  room: z.string().optional(),
  timing: z.string().optional(),
});

/** Shift-based, not day-based — the source Google Sheet has no weekday column, only Morning/Evening/Night. */
export const doctorScheduleEntrySchema = z.object({
  doctorName: z.string().min(1),
  room: z.string().min(1),
  timing: z.string().min(1),
  shift: z.string().min(1),
});

/** One worksheet tab in the published Google Sheet == one day's schedule. */
export const doctorScheduleDaySchema = z.object({
  date: z.string(), // YYYY-MM-DD, derived from the worksheet title
  day: z.string(), // weekday name, computed from `date` — not read verbatim off the sheet title
  regularDoctors: z.array(doctorScheduleEntrySchema),
  visitingSpecialists: z.array(visitingSpecialistSchema),
});

export const healthCenterPutSchema = z.object({
  campusId: z.string().min(1),
  medicalOfficers: z.array(medicalOfficerSchema),
  visitingSpecialists: z.array(visitingSpecialistSchema),
  doctorSchedules: z.array(doctorScheduleDaySchema),
  hospitals: z.array(hospitalSchema),
  contacts: z.array(contactSchema),
  services: z.array(z.string().min(1)),
  address: z.string().min(1),
  officialUrl: z.string().url(),
  doctorScheduleUrl: z.string().url(),
  dataSource: z.enum(['live', 'static']),
  lastSyncedAt: z.string().datetime().nullable(),
  lastAttemptedAt: z.string().datetime().nullable(),
});

export type Contact = z.infer<typeof contactSchema>;
export type MedicalOfficer = z.infer<typeof medicalOfficerSchema>;
export type Hospital = z.infer<typeof hospitalSchema>;
export type VisitingSpecialist = z.infer<typeof visitingSpecialistSchema>;
export type DoctorScheduleEntry = z.infer<typeof doctorScheduleEntrySchema>;
export type DoctorScheduleDay = z.infer<typeof doctorScheduleDaySchema>;
export type HealthCenterDoc = z.infer<typeof healthCenterPutSchema>;

export const DEFAULT_HEALTH_CENTER_DOC: Omit<HealthCenterDoc, 'campusId'> = {
  medicalOfficers: [
    { name: 'Dr. Anukriti Kumari' },
    { name: 'Dr. Bhuvnesh Kumar' },
    { name: 'Dr. Gaurav Kumar Viswas' },
    { name: 'Dr. Hemant Joshi' },
    { name: 'Dr. Neha Sharma' },
  ],
  visitingSpecialists: [
    { specialty: 'Psychiatry' },
    { specialty: 'Gynaecology' },
    { specialty: 'Paediatrics' },
    { specialty: 'ENT' },
    { specialty: 'Internal Medicine' },
    { specialty: 'Dental Service' },
    { specialty: 'Orthopaedics' },
  ],
  doctorSchedules: [],
  hospitals: [
    { name: 'AIIMS Jodhpur' },
    { name: 'Goyal Hospital & Research Centre' },
    { name: 'MediPulse Hospital' },
    { name: 'ASG Eye Hospital' },
    { name: 'Vasundhara Hospital' },
  ],
  contacts: [
    { label: '1st OPD', phone: '0291-2801178' },
    { label: 'Health Center Office', phone: '0291-2801184' },
    { label: 'PHC Reception', phone: '0291-2801190' },
    { label: 'Pharmacy', phone: '0291-2801183' },
    { label: 'Professor In-Charge', phone: '0291-2801185' },
    { label: 'Laboratory', phone: '0291-2801186' },
    { label: 'Campus Security', phone: '100' },
    { label: 'Ambulance', phone: '108' },
    { label: 'Fire', phone: '101' },
  ],
  services: [
    '24×7 Medical Officers',
    '24×7 Nursing Officers',
    'Diagnostic Laboratory',
    'In-house Pharmacy',
    'Physiotherapy Unit',
    'Emergency Room',
    'Day Care Room',
    'Male Ward',
    'Female Ward',
    'Isolation Rooms',
    'ACLS Ambulance',
    'BLS Ambulance',
    'Health Camps',
    'Vaccination Camps',
    'Blood Donation Camps',
  ],
  address:
    'Office of Health Center, Indian Institute of Technology Jodhpur, NH 62 Nagaur Road, Karwar, Jodhpur, 342030',
  officialUrl: 'https://www.iitj.ac.in/health-center',
  doctorScheduleUrl: 'https://www.iitj.ac.in/health-center/en/doctors-schedule',
  dataSource: 'static',
  lastSyncedAt: null,
  lastAttemptedAt: null,
};
