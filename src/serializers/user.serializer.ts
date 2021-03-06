import { Serializer } from 'jsonade';

export const userSerializer = new Serializer('users', {
  keyForAttribute: 'camelCase',
  attributes: [
    'id',
    'email',
    'firstName',
    'lastName',
    'hasAccess',
    'role',
    'createdAt',
    'updatedAt',
  ],
});
