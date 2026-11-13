// Run locally or in a protected CI runner with two independent PostgreSQL connections.
// Required: DATABASE_URL (prefer dedicated sandbox read-only credentials).
// No tables, writes, payments, or emails are involved.
import pg from "pg";
import assert from "node:assert/strict";
const { Client } = pg;
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
const clients = [new Client({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:true}}),new Client({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:true}})];
const key = "26720261113";
try {
  await Promise.all(clients.map(c=>c.connect()));
  const pids=await Promise.all(clients.map(c=>c.query("select pg_backend_pid() as pid")));
  assert.notEqual(pids[0].rows[0].pid,pids[1].rows[0].pid,"independent backends required");
  await clients[0].query("BEGIN READ ONLY");
  const holder=await clients[0].query("select pg_try_advisory_xact_lock($1::bigint) as acquired",[key]);
  assert.equal(holder.rows[0].acquired,true);
  await clients[1].query("BEGIN READ ONLY");
  const contender=await clients[1].query("select pg_try_advisory_xact_lock($1::bigint) as acquired",[key]);
  assert.equal(contender.rows[0].acquired,false,"contender must lose while holder transaction is open");
  await clients[0].query("ROLLBACK");
  const after=await clients[1].query("select pg_try_advisory_xact_lock($1::bigint) as acquired",[key]);
  assert.equal(after.rows[0].acquired,true,"contender acquires after holder releases");
  console.log(JSON.stringify({result:"PASS",pids:pids.map(x=>x.rows[0].pid),holder:true,contender:false,after_release:true}));
} finally {
  await Promise.allSettled(clients.map(c=>c.query("ROLLBACK")));
  await Promise.allSettled(clients.map(c=>c.end()));
}
// This proves concurrent independent transaction-level advisory lock exclusion,
// NOT the installed purchase-email claim RPC's SKIP LOCKED semantics.
