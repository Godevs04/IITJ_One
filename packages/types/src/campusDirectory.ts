import { z } from 'zod';

/**
 * Campus Directory — Phase 1. Architecture-complete, data-empty by design:
 * no photos/publications/office-hours/etc yet (see roadmap note on each
 * entity below), but the schema is meant to support those additively later
 * without a redesign.
 */

// Organizations include Departments, Clubs, Committees, Student Council,
// Administrative Offices, Hostels, Labs, and Centers — a closed set fixed by
// the institute's own structure, unlike the free-form `category` field below.
export const ORGANIZATION_TYPES = [
  'department',
  'club',
  'committee',
  'studentCouncil',
  'administrativeOffice',
  'hostel',
  'lab',
  'center',
] as const;
export type OrganizationType = (typeof ORGANIZATION_TYPES)[number];

const optionalUrl = z.string().trim().url().optional().or(z.literal(''));
const optionalEmail = z.string().trim().email().optional().or(z.literal(''));
const optionalPhone = z.string().trim().max(30).optional().or(z.literal(''));

// --- Department ---------------------------------------------------------

export const departmentCreateSchema = z.object({
  campusId: z.string().min(1),
  name: z.string().trim().min(1).max(200),
  shortName: z.string().trim().max(30).optional(),
  building: z.string().trim().max(200).optional(),
  email: optionalEmail,
  phone: optionalPhone,
  website: optionalUrl,
  active: z.boolean().default(true),
});
export const departmentUpdateSchema = departmentCreateSchema.omit({ campusId: true }).partial();

export type DepartmentCreateInput = z.infer<typeof departmentCreateSchema>;
export type DepartmentUpdateInput = z.infer<typeof departmentUpdateSchema>;

export interface DepartmentDoc extends DepartmentCreateInput {
  _id?: string;
  createdAt: string;
  updatedAt: string;
}

// --- Organization --------------------------------------------------------

export const organizationCreateSchema = z.object({
  campusId: z.string().min(1),
  name: z.string().trim().min(1).max(200),
  type: z.enum(ORGANIZATION_TYPES),
  category: z.string().trim().max(100).optional(),
  description: z.string().trim().max(2000).optional(),
  email: optionalEmail,
  phone: optionalPhone,
  website: optionalUrl,
  active: z.boolean().default(true),
});
export const organizationUpdateSchema = organizationCreateSchema.omit({ campusId: true }).partial();

export type OrganizationCreateInput = z.infer<typeof organizationCreateSchema>;
export type OrganizationUpdateInput = z.infer<typeof organizationUpdateSchema>;

export interface OrganizationDoc extends OrganizationCreateInput {
  _id?: string;
  createdAt: string;
  updatedAt: string;
}

// --- Person ---------------------------------------------------------------
// Phase 1 deliberately excludes: profile photo/avatar, publications, office
// hours, course list, research projects — see module roadmap. researchAreas
// is a free-form tag list, not a controlled taxonomy, so it can grow without
// a schema change.

export const personCreateSchema = z.object({
  campusId: z.string().min(1),
  name: z.string().trim().min(1).max(200),
  designation: z.string().trim().max(200).optional(),
  departmentId: z.string().trim().min(1).optional(),
  email: optionalEmail,
  phone: optionalPhone,
  office: z.string().trim().max(200).optional(),
  website: optionalUrl,
  scholar: optionalUrl,
  orcid: z.string().trim().max(50).optional(),
  researchAreas: z.array(z.string().trim().min(1)).default([]),
  active: z.boolean().default(true),
});
export const personUpdateSchema = personCreateSchema.omit({ campusId: true }).partial();

export type PersonCreateInput = z.infer<typeof personCreateSchema>;
export type PersonUpdateInput = z.infer<typeof personUpdateSchema>;

export interface PersonDoc extends PersonCreateInput {
  _id?: string;
  createdAt: string;
  updatedAt: string;
}

// --- Role -------------------------------------------------------------------
// A person can hold multiple roles (e.g. HOD of one department AND Programme
// Coordinator of another) — roles are their own collection, not embedded on
// Person, specifically so that's representable.

export const roleCreateSchema = z.object({
  campusId: z.string().min(1),
  personId: z.string().trim().min(1),
  title: z.string().trim().min(1).max(200),
  organizationId: z.string().trim().min(1).optional(),
  category: z.string().trim().max(100).optional(),
  priority: z.number().int().default(0),
  active: z.boolean().default(true),
});
export const roleUpdateSchema = roleCreateSchema.omit({ campusId: true }).partial();

export type RoleCreateInput = z.infer<typeof roleCreateSchema>;
export type RoleUpdateInput = z.infer<typeof roleUpdateSchema>;

export interface RoleDoc extends RoleCreateInput {
  _id?: string;
  createdAt: string;
  updatedAt: string;
}
