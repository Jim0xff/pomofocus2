import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const sourceFiles = [
  'src/index.ts',
  'src/routes/signups.ts',
  'src/services/signup-service.ts',
  'src/models/Signup.ts',
].map((p) => path.join(process.cwd(), p));

describe('OBL-07 scope guard', () => {
  it('does not introduce out-of-scope features', () => {
    const merged = sourceFiles.map((f) => fs.readFileSync(f, 'utf8').toLowerCase()).join('\n');

    expect(merged).not.toContain('bullmq');
    expect(merged).not.toContain('ratelimit');
    expect(merged).not.toContain('notify');
    expect(merged).not.toContain('smtp');
    expect(merged).not.toContain('/export');
  });

  it('signup submit endpoint remains auth-free as required by PRD', () => {
    const routes = fs.readFileSync(path.join(process.cwd(), 'src/routes/signups.ts'), 'utf8').toLowerCase();
    expect(routes).not.toContain('authorization');
    expect(routes).not.toContain('bearer');
    expect(routes).not.toContain('middlewareauth');
  });
});
