// Runs the real migration in isolated PostgreSQL with a minimal Supabase auth
// schema. Verifies SQL permissions and CAS, not live OAuth or JWT issuance.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
await db.waitReady;
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant usage on schema public to anon, authenticated;
`);
const migration = await readFile(
  new URL('../migrations/202610300001_iris_state.sql', import.meta.url),
  'utf8',
);
await db.exec(migration);
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
await db.query('insert into auth.users(id) values ($1), ($2)', [A, B]);
let assertions = 0;
async function asUser(id) {
  await db.exec('reset role; set role authenticated;');
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
}
async function save(data, revision = null) {
  return (
    await db.query('select public.save_iris_state($1::jsonb, $2::integer) as revision', [
      JSON.stringify(data),
      revision,
    ])
  ).rows[0].revision;
}
async function rejectsCode(fn, code, message) {
  await assert.rejects(fn, (error) => error.code === code, message);
  assertions++;
}

await asUser(A);
assert.equal(await save({ owner: 'A', xp: 0 }), 1);
assertions++;
assert.deepEqual((await db.query('select data, revision from public.app_state')).rows, [
  { data: { owner: 'A', xp: 0 }, revision: 1 },
]);
assertions++;
await rejectsCode(() => save({ owner: 'A', xp: 999 }), 'P0001', 'second create must conflict');
assert.equal(await save({ owner: 'A', xp: 25 }, 1), 2);
assertions++;
await rejectsCode(() => save({ owner: 'A', xp: 500 }, 1), 'P0001', 'stale revision must conflict');
assert.equal((await db.query('select data from public.app_state')).rows[0].data.xp, 25);
assertions++;

await asUser(B);
assert.equal((await db.query('select * from public.app_state')).rows.length, 0);
assertions++;
assert.equal(await save({ owner: 'B', xp: 10 }), 1);
assertions++;
assert.equal((await db.query('select data from public.app_state')).rows[0].data.owner, 'B');
assertions++;
assert.equal(
  (await db.query('select * from public.app_state where user_id = $1', [A])).rows.length,
  0,
);
assertions++;
await rejectsCode(
  () => save({ owner: 'B', xp: 900 }, 2),
  'P0001',
  'B cannot update A using A revision',
);
await rejectsCode(
  () => db.query("update public.app_state set data = '{}'::jsonb"),
  '42501',
  'direct update denied',
);
await rejectsCode(() => db.query('delete from public.app_state'), '42501', 'direct delete denied');
await rejectsCode(
  () => db.query("insert into public.app_state(user_id,data) values ($1, '{}'::jsonb)", [A]),
  '42501',
  'direct insert denied',
);
await rejectsCode(() => save([], 1), '22023', 'array state denied');
await rejectsCode(() => save({}, 0), '22023', 'zero revision denied');

await asUser(A);
const racing = await Promise.allSettled([
  save({ owner: 'A', xp: 30 }, 2),
  save({ owner: 'A', xp: 40 }, 2),
]);
assert.equal(racing.filter((r) => r.status === 'fulfilled').length, 1);
assertions++;
assert.equal(racing.filter((r) => r.status === 'rejected' && r.reason.code === 'P0001').length, 1);
assertions++;
assert.equal((await db.query('select revision from public.app_state')).rows[0].revision, 3);
assertions++;

await db.exec('reset role; set role anon;');
await rejectsCode(
  () => db.query('select * from public.app_state'),
  '42501',
  'anonymous select denied',
);
await rejectsCode(() => save({}), '42501', 'anonymous RPC denied');
await asUser('');
await rejectsCode(() => save({}), '42501', 'missing user identity denied');

await db.close();
console.log(
  JSON.stringify(
    { assertions, status: 'passed', engine: 'PGlite PostgreSQL', liveSupabase: false },
    null,
    2,
  ),
);
