import { SetMetadata } from '@nestjs/common';
import { Permission } from '../constants/permissions';

export const PERMISSIONS_KEY = 'authorization:permissions';

/**
 * Declares the permissions a route requires.
 *
 * The requirement is conjunctive: a caller must hold every listed permission.
 * List several when the endpoint needs several capabilities — for example
 * attaching a document to a patient needs both `patients.manage` and
 * `documents.manage`.
 */
export const Permissions = (...permissions: Permission[]) => SetMetadata(PERMISSIONS_KEY, permissions);
