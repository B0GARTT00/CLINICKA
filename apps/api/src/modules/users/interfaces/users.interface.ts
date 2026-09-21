export interface User {
  id: string;
  email: string;
  displayName: string;
  status: string;
  roles: { id: string; name: string }[];
  createdAt: Date;
  updatedAt: Date;
}
