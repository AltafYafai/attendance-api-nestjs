import { Role } from '../enums/role.enum';

// Principal derived from a verified attendance-auth access token.
export interface AuthenticatedUser {
  userId: string;
  username: string;
  role: Role;
  businessId: string | null;
}
