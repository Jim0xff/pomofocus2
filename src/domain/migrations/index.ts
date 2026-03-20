export { CreatePhase2DomainSchema20260320000000 } from './20260320000000-create-phase2-domain-schema';
export { AddSessionQueryIndexes20260320194951 } from './20260320194951-add-session-query-indexes';

import { CreatePhase2DomainSchema20260320000000 } from './20260320000000-create-phase2-domain-schema';
import { AddSessionQueryIndexes20260320194951 } from './20260320194951-add-session-query-indexes';

export const DOMAIN_MIGRATIONS = [
  CreatePhase2DomainSchema20260320000000,
  AddSessionQueryIndexes20260320194951,
] as const;
