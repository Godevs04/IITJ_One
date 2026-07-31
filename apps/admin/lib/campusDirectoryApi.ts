import type {
  DepartmentCreateInput,
  DepartmentUpdateInput,
  OrganizationCreateInput,
  OrganizationUpdateInput,
  PersonCreateInput,
  PersonUpdateInput,
  RoleCreateInput,
  RoleUpdateInput,
} from '@iitj1/types';
import { apiFetch, campusId } from './api';
import type {
  AdminDepartmentsResponse,
  AdminOrganizationsResponse,
  AdminPeopleResponse,
  AdminRolesResponse,
  DepartmentDoc,
  OrganizationDoc,
  PersonDoc,
  RoleDoc,
} from './types';

export interface DepartmentListOptions {
  page?: number;
  limit?: number;
  search?: string;
  active?: boolean;
  sort?: 'asc' | 'desc';
}

export function listDepartments(opts: DepartmentListOptions = {}): Promise<AdminDepartmentsResponse> {
  return apiFetch<AdminDepartmentsResponse>('/admin/campusDirectory/departments', {
    query: {
      campus: campusId,
      page: String(opts.page ?? 1),
      limit: String(opts.limit ?? 20),
      search: opts.search,
      active: opts.active === undefined ? undefined : String(opts.active),
      sort: opts.sort,
    },
  });
}

export function createDepartment(input: Omit<DepartmentCreateInput, 'campusId'>): Promise<DepartmentDoc> {
  return apiFetch<DepartmentDoc>('/admin/campusDirectory/departments', {
    method: 'POST',
    body: { campusId, ...input },
  });
}

export function updateDepartment(id: string, input: DepartmentUpdateInput): Promise<DepartmentDoc> {
  return apiFetch<DepartmentDoc>(`/admin/campusDirectory/departments/${id}`, { method: 'PUT', body: input });
}

export function deleteDepartment(id: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/admin/campusDirectory/departments/${id}`, { method: 'DELETE' });
}

export interface OrganizationListOptions {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  active?: boolean;
  sort?: 'asc' | 'desc';
}

export function listOrganizations(opts: OrganizationListOptions = {}): Promise<AdminOrganizationsResponse> {
  return apiFetch<AdminOrganizationsResponse>('/admin/campusDirectory/organizations', {
    query: {
      campus: campusId,
      page: String(opts.page ?? 1),
      limit: String(opts.limit ?? 20),
      search: opts.search,
      type: opts.type,
      active: opts.active === undefined ? undefined : String(opts.active),
      sort: opts.sort,
    },
  });
}

export function createOrganization(input: Omit<OrganizationCreateInput, 'campusId'>): Promise<OrganizationDoc> {
  return apiFetch<OrganizationDoc>('/admin/campusDirectory/organizations', {
    method: 'POST',
    body: { campusId, ...input },
  });
}

export function updateOrganization(id: string, input: OrganizationUpdateInput): Promise<OrganizationDoc> {
  return apiFetch<OrganizationDoc>(`/admin/campusDirectory/organizations/${id}`, { method: 'PUT', body: input });
}

export function deleteOrganization(id: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/admin/campusDirectory/organizations/${id}`, { method: 'DELETE' });
}

export interface PersonListOptions {
  page?: number;
  limit?: number;
  search?: string;
  departmentId?: string;
  active?: boolean;
  sort?: 'asc' | 'desc';
}

export function listPeople(opts: PersonListOptions = {}): Promise<AdminPeopleResponse> {
  return apiFetch<AdminPeopleResponse>('/admin/campusDirectory/people', {
    query: {
      campus: campusId,
      page: String(opts.page ?? 1),
      limit: String(opts.limit ?? 20),
      search: opts.search,
      departmentId: opts.departmentId,
      active: opts.active === undefined ? undefined : String(opts.active),
      sort: opts.sort,
    },
  });
}

export function createPerson(input: Omit<PersonCreateInput, 'campusId'>): Promise<PersonDoc> {
  return apiFetch<PersonDoc>('/admin/campusDirectory/people', {
    method: 'POST',
    body: { campusId, ...input },
  });
}

export function updatePerson(id: string, input: PersonUpdateInput): Promise<PersonDoc> {
  return apiFetch<PersonDoc>(`/admin/campusDirectory/people/${id}`, { method: 'PUT', body: input });
}

export function deletePerson(id: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/admin/campusDirectory/people/${id}`, { method: 'DELETE' });
}

export interface RoleListOptions {
  page?: number;
  limit?: number;
  search?: string;
  personId?: string;
  organizationId?: string;
  category?: string;
  active?: boolean;
  sort?: 'asc' | 'desc';
}

export function listRoles(opts: RoleListOptions = {}): Promise<AdminRolesResponse> {
  return apiFetch<AdminRolesResponse>('/admin/campusDirectory/roles', {
    query: {
      campus: campusId,
      page: String(opts.page ?? 1),
      limit: String(opts.limit ?? 20),
      search: opts.search,
      personId: opts.personId,
      organizationId: opts.organizationId,
      category: opts.category,
      active: opts.active === undefined ? undefined : String(opts.active),
      sort: opts.sort,
    },
  });
}

export function createRole(input: Omit<RoleCreateInput, 'campusId'>): Promise<RoleDoc> {
  return apiFetch<RoleDoc>('/admin/campusDirectory/roles', {
    method: 'POST',
    body: { campusId, ...input },
  });
}

export function updateRole(id: string, input: RoleUpdateInput): Promise<RoleDoc> {
  return apiFetch<RoleDoc>(`/admin/campusDirectory/roles/${id}`, { method: 'PUT', body: input });
}

export function deleteRole(id: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/admin/campusDirectory/roles/${id}`, { method: 'DELETE' });
}
