import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import assert from "node:assert/strict";

// Isolated PostgreSQL execution. Auth/Storage API services are not emulated;
// these minimal schemas supply their SQL contracts for migration/RLS tests.
const db=new PGlite();
let checks=0;
const check=(condition,message)=>{assert.ok(condition,message);checks++;};
const a="10000000-0000-4000-8000-000000000001", b="10000000-0000-4000-8000-000000000002";
const accountA="20000000-0000-4000-8000-000000000001",accountB="20000000-0000-4000-8000-000000000002";
const scalar=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0];
const asUser=async(id)=>{await db.exec("reset role");await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec("set role authenticated");};
const search=async(filters)=>scalar("select public.search_finance_transactions($1::jsonb)",[JSON.stringify(filters)]);
const report=async(from,to)=>scalar("select public.finance_period_report($1::date,$2::date)",[from,to]);
try {
  await db.exec(`create role authenticated; create role anon; create schema auth; create schema storage;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
    alter table storage.objects enable row level security;
    create function storage.foldername(text) returns text[] language sql immutable as $$ select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1] $$;
    grant usage on schema auth,storage to authenticated,anon;
    grant select,insert,update,delete on storage.objects to authenticated;
    create publication supabase_realtime;`);
  const migrations=(await readdir("supabase/migrations")).filter((file)=>file.endsWith(".sql")).sort();
  for(const file of migrations){
    // gen_random_uuid is built into PostgreSQL; pgcrypto itself is not bundled
    // in PGlite. No migration source file is changed for this compatibility step.
    const sql=(await readFile("supabase/migrations/"+file,"utf8")).replace(/create extension if not exists pgcrypto;/i,"");
    if (file === "202609090001_safe_deletion_and_account_status.sql") {
      await assert.rejects(db.query("lock table public.categories in access exclusive mode"), { code: "25P01" }); checks++;
      const legacyOwner="10000000-0000-4000-8000-000000000003";
      const missingOwner="10000000-0000-4000-8000-000000000004";
      await db.query("insert into auth.users(id,email) values($1,'legacy@example.test'),($2,'missing@example.test')",[legacyOwner,missingOwner]);
      // Synthetic pre-migration state: a missing fallback and a legacy duplicate
      // under a parent (legal under the former per-parent unique index).
      await db.exec("alter table public.categories disable trigger categories_protect_uncategorized");
      await db.query("update public.categories set name='Legacy custom',is_default=false where user_id=$1 and name='Uncategorized'",[missingOwner]);
      await db.exec("alter table public.categories enable trigger categories_protect_uncategorized");
      const legacyParent=await scalar("insert into public.categories(user_id,name,kind) values($1,'Legacy parent','expense') returning id",[legacyOwner]);
      const legacyDuplicate=await scalar("insert into public.categories(user_id,name,kind,parent_id,is_default) values($1,'Uncategorized','both',$2,true) returning id",[legacyOwner,legacyParent]);
      const legacyAccount=await scalar("insert into public.accounts(user_id,name,type) values($1,'Legacy bank','bank') returning id",[legacyOwner]);
      await db.query("insert into public.transactions(user_id,account_id,category_id,type,amount,occurred_at,merchant) values($1,$2,$3,'expense',123.45,'2025-03-14','Preserved migration history')",[legacyOwner,legacyAccount,legacyDuplicate]);
      const historyBefore=(await db.query("select id,user_id,account_id,type,amount,occurred_at,merchant from public.transactions order by id")).rows;
      const categoriesBefore=(await db.query("select * from public.categories order by id")).rows;
      const failurePoint="alter table public.categories disable trigger categories_protect_uncategorized;";
      assert.ok(sql.includes(failurePoint));
      await assert.rejects(db.query(sql.replace(failurePoint,failurePoint+"\nraise exception 'Injected migration failure';")),/Injected migration failure/);checks++;
      check(Number(await scalar("select count(*) from information_schema.columns where table_schema='public' and table_name='accounts' and column_name='is_active'"))===0,"failure rolls back earlier account DDL");
      check(await scalar("select tgenabled from pg_trigger where tgrelid='public.categories'::regclass and tgname='categories_protect_uncategorized'")==='O',"failure restores category protection trigger");
      assert.deepEqual((await db.query("select * from public.categories order by id")).rows,categoriesBefore);checks++;
      const blockEnd=/end;\s*\$migration\$;/;
      assert.ok(blockEnd.test(sql));
      await assert.rejects(db.query(sql.replace(blockEnd,"raise exception 'Injected late failure';\nend;\n$migration$;")),/Injected late failure/);checks++;
      assert.deepEqual((await db.query("select * from public.categories order by id")).rows,categoriesBefore);checks++;
      check(Number(await scalar("select count(*) from information_schema.columns where table_schema='public' and table_name='accounts' and column_name='is_active'"))===0,"late failure rolls back entire migration");
      check(await scalar("select to_regclass('public.categories_one_uncategorized')")===null,"late failure rolls back normalization index");
      // A previous runner may already have committed the first account statement.
      await db.exec("alter table public.accounts add column is_active boolean not null default true");
      await db.query("update public.accounts set is_active=false where id=$1",[legacyAccount]);
      // Extended protocol accepts exactly one statement and does not supply an
      // enclosing transaction block as the old whole-file db.exec test did.
      await db.query(sql);
      check(Number(await scalar("select count(*) from public.categories where user_id=$1 and lower(name)='uncategorized' and is_default and archived_at is null and parent_id is null and kind='both'",[missingOwner]))===1,"migration creates a protected missing fallback");
      check(Number(await scalar("select count(*) from public.categories where user_id=$1 and lower(name)='uncategorized'",[legacyOwner]))===1,"legacy duplicate fallback consolidated");
      const fallback=await scalar("select id from public.categories where user_id=$1 and name='Uncategorized'",[legacyOwner]);
      check(await scalar("select category_id from public.transactions where user_id=$1",[legacyOwner])===fallback,"duplicate fallback transactions reassigned");
      await assert.rejects(db.query("insert into public.categories(user_id,name,kind,parent_id) values($1,'Uncategorized','both',$2)",[legacyOwner,legacyParent]),{code:'23505'});checks++;
      check(Number(await scalar("select count(*) from public.categories where lower(name)='archived'"))===0,"normalization creates no Archived category");
      await db.query(sql); // A retry also preserves data and status.
      await db.transaction(async(tx)=>{await tx.query(sql);}); // Existing transaction wrapper is supported too.
      check(await scalar("select is_active from public.accounts where id=$1",[legacyAccount])===false,"retry does not reactivate inactive accounts");
      assert.deepEqual((await db.query("select id,user_id,account_id,type,amount,occurred_at,merchant from public.transactions order by id")).rows,historyBefore);checks++;
      check(Number(await scalar("select count(*) from public.categories where user_id=$1 and name='Uncategorized'",[legacyOwner]))===1,"retry does not duplicate fallback");
    } else await db.exec(sql);
  }
  await db.query("insert into auth.users(id,email) values($1,'owner-a@example.test'),($2,'owner-b@example.test')",[a,b]);
  check(Number(await scalar("select count(*) from public.profiles"))===4,"new and existing auth users bootstrap");
  for(const table of ["notification_preferences","dashboard_preferences","ai_settings"])
    check(Number(await scalar(`select count(*) from public.${table}`))===4,`auth bootstrap ${table}`);
  check(Number(await scalar("select count(*) from public.categories where name='Uncategorized'"))===4,"protected fallback per user");
  await asUser(a);
  await db.query("insert into public.accounts(id,name,type,institution) values($1,'Test savings','savings','Test Bank')",[accountA]);
  const categoryA=await scalar("select id from public.categories where name='Food & dining'");
  await asUser(b);
  await db.query("insert into public.accounts(id,name,type,institution) values($1,'Private savings','savings','Test Bank')",[accountB]);
  await db.query("insert into public.transactions(account_id,type,amount,occurred_at,merchant) values($1,'expense',99999,'2026-08-10T12:00:00Z','Private B')",[accountB]);
  await asUser(a);
  for(const [month,income,expense] of [[7,10000,4000],[8,20000,8000],[9,30000,12000]]){
    for(const [type,amount] of [["income",income],["expense",expense]])await db.query("insert into public.transactions(account_id,category_id,type,amount,occurred_at,merchant) values($1,$2,$3,$4,$5,$6)",[accountA,categoryA,type,amount,`2026-0${month}-05T10:00:00Z`,type+" synthetic"]);
  }
  for(const [month,income,expense] of [[7,10000,4000],[8,20000,8000],[9,30000,12000]]){
    const result=await report(`2026-0${month}-01`,month===9?"2026-10-01":`2026-0${month+1}-01`);
    check(Number(result.income)===income&&Number(result.expenses)===expense&&result.count===2,"historical period aggregates "+month);
  }
  check((await report("2024-01-01","2025-01-01")).count===0,"empty historical year");
  const filtered=await search({account:accountA,category:categoryA,type:"expense",search:"synthetic",minAmount:"5000",maxAmount:"10000",dateFrom:"2026-08-01",dateTo:"2026-09-01",sort:"amount_desc",pageSize:1});
  check(filtered.total===1&&Number(filtered.rows[0].amount)===8000,"combined SQL filters before paging");
  check((await search({account:accountB})).total===0,"other owner account filter cannot expose rows");
  check((await search({search:"Private B"})).total===0,"search cannot expose other owner");
  const batch=await scalar("insert into public.imports(account_id,file_name,file_type,status,created_at) values($1,'synthetic.csv','csv','imported','2026-09-07T10:00:00Z') returning id",[accountA]);
  for(const seq of [2,1,3])await db.query("insert into public.transactions(account_id,type,amount,occurred_at,merchant,import_id,metadata,created_at) values($1,'expense',10,'2026-09-06T10:00:00Z','Ordered',$2,$3,$4)",[accountA,batch,JSON.stringify({import_row:seq}),`2026-09-07T11:0${seq}:00Z`]);
  const ordered=await search({importId:batch,pageSize:2});
  check(ordered.rows.map((row)=>row.metadata.import_row).join(",")==="1,2","statement row sequence survives different creation timestamps");
  check((await search({importId:batch,page:1,pageSize:2})).rows[0].metadata.import_row===3,"stable second page");
  check((await search({importId:batch,sort:"uploaded_desc"})).rows.map((row)=>row.metadata.import_row).join(",")==="1,2,3","upload ordering uses batch timestamp and original row");
  const goal=await scalar("insert into public.goals(name,target_amount,linked_account_id,description) values('Synthetic goal',1000,$1,'Original') returning id",[accountA]);
  const contribution=await scalar("insert into public.goal_contributions(goal_id,amount,source_account_id) values($1,100,$2) returning id",[goal,accountA]);
  await db.query("update public.goals set target_amount=2000,description='Edited' where id=$1",[goal]);
  check(Number(await scalar("select current_amount from public.goals where id=$1",[goal]))===100,"editing goal preserves contributions");
  await db.query("update public.goal_contributions set amount=150 where id=$1",[contribution]);
  check(Number(await scalar("select current_amount from public.goals where id=$1",[goal]))===150,"contribution edit recalculates");
  await assert.rejects(db.query("update public.goals set linked_account_id=$1 where id=$2",[accountB,goal]));checks++;
  const budget=await scalar("select public.save_budget_details(null,$1::jsonb,$2::uuid[])",[JSON.stringify({name:"Test budget",amount:"1000",period:"monthly",threshold:80}),[categoryA]]);
  await scalar("select public.save_budget_details($1,$2::jsonb,$3::uuid[])",[budget,JSON.stringify({name:"Edited budget",amount:"2000",period:"yearly",threshold:90}),[categoryA]]);
  check(Number(await scalar("select limit_amount from public.budgets where id=$1",[budget]))===2000,"budget edit persists atomically");
  await db.query("update public.goals set status='archived' where id=$1",[goal]);
  check(Number(await scalar("select count(*) from public.goal_contributions where goal_id=$1",[goal]))===1,"archive retains contributions");
  const original=filtered.rows[0].id;
  await db.query("update public.transactions set occurred_at='2026-09-10T12:00:00Z',amount=9000 where id=$1",[original]);
  check(Number((await report("2026-08-01","2026-09-01")).expenses)===0,"old historical period invalidated by date edit");
  check(Number((await report("2026-09-01","2026-10-01")).expenses)===21030,"new period receives edited expense exactly once");
  const bill=await scalar("insert into public.bills(title,amount,due_date,account_id) values('Test bill',10,'2026-09-10',$1) returning id",[accountA]);
  await db.query("update public.bills set status='paid',amount=20 where id=$1",[bill]);
  check(await scalar("select status from public.bills where id=$1",[bill])==="paid","bill status persists");
  const recurring=await scalar("insert into public.recurring_transactions(title,amount,type,account_id,frequency,start_date,next_date) values('Repeating',50,'expense',$1,'monthly','2026-09-10','2026-10-10') returning id",[accountA]);
  await db.query("update public.recurring_transactions set active=false where id=$1",[recurring]);
  check(Number(await scalar("select count(*) from public.recurring_transactions where id=$1 and not active and archived_at is null",[recurring]))===1,"pause remains resumable");
  await db.query("update public.recurring_transactions set archived_at=now(),notes='Preserved history' where id=$1",[recurring]);
  check(Number(await scalar("select count(*) from public.recurring_transactions where id=$1 and archived_at is null",[recurring]))===0,"archive stays absent from active query");
  check(Number(await scalar("select count(*) from public.recurring_transactions where id=$1",[recurring]))===1,"archived recurring record not deleted");
  await db.query("update public.budgets set active=false where id=$1",[budget]);
  check(Number(await scalar("select count(*) from public.budget_categories where budget_id=$1",[budget]))===1,"budget archive preserves category links");
  const ownedCategory=await scalar("insert into public.categories(name,kind,parent_id) values('Managed category','expense',$1) returning id",[categoryA]);
  await db.query("update public.categories set name='Edited category',sort_order=17 where id=$1",[ownedCategory]);
  check(Number(await scalar("select sort_order from public.categories where id=$1",[ownedCategory]))===17,"category edits persist");
  const rule=await scalar("insert into public.merchant_rules(pattern,merchant_normalized,category_id,account_id,transaction_type) values('SYNTHETIC','SYNTHETIC',$1,$2,'expense') returning id",[categoryA,accountA]);
  await db.query("update public.merchant_rules set pattern='EDITED',merchant_normalized='EDITED' where id=$1",[rule]);
  await db.query("delete from public.merchant_rules where id=$1",[rule]);
  check((await search({account:accountA})).total===9,"merchant rule mutations leave transaction history intact");
  // A local-day boundary must include late UTC activity on the next Indian day.
  await db.query("update public.profiles set timezone='Asia/Kolkata' where id=$1",[a]);
  await db.query("insert into public.transactions(account_id,type,amount,occurred_at,merchant) values($1,'expense',7,'2026-09-30T20:00:00Z','Timezone boundary')",[accountA]);
  check((await search({dateFrom:'2026-10-01',dateTo:'2026-10-02'})).total===1,"date filters use profile timezone exclusive end");
  check(Number((await report('2026-10-01','2026-11-01')).expenses)===7,"report and query timezone agree");
  check((await search({category:"uncategorized"})).total===4,"null category drilldown does not become an invalid UUID or all categories");

  const fallback=await scalar("select id from public.categories where name='Uncategorized'");
  await assert.rejects(db.query("select public.delete_category_safely($1)",[fallback]),/protected/);checks++;
  await assert.rejects(db.query("update public.categories set kind='income' where id=$1",[fallback]),/protected/);checks++;
  const emptyCategory=await scalar("insert into public.categories(name,kind) values('Empty removal','expense') returning id");
  await scalar("select public.delete_category_safely($1)",[emptyCategory]);
  check(Number(await scalar("select count(*) from public.categories where id=$1",[emptyCategory]))===0,"empty category deleted");
  const parent=await scalar("insert into public.categories(name,kind) values('Delete parent','expense') returning id");
  const child=await scalar("insert into public.categories(name,kind,parent_id) values('Delete child','expense',$1) returning id",[parent]);
  await db.query("insert into public.categories(name,kind) values('Delete child','expense')");
  const grandchild=await scalar("insert into public.categories(name,kind,parent_id) values('Delete grandchild','expense',$1) returning id",[child]);
  for(const category of [parent,child,grandchild]) await db.query("insert into public.transactions(account_id,category_id,type,amount,occurred_at,merchant) values($1,$2,'expense',13,'2026-09-12','Preserved category transaction')",[accountA,category]);
  const deleteRule=await scalar("insert into public.merchant_rules(pattern,merchant_normalized,category_id) values('DELETE RULE','DELETE RULE',$1) returning id",[child]);
  await db.query("update public.bills set category_id=$1 where id=$2",[child,bill]);
  await db.query("update public.recurring_transactions set category_id=$1 where id=$2",[grandchild,recurring]);
  await db.query("insert into public.budget_categories(user_id,budget_id,category_id) values($1,$2,$3)",[a,budget,child]);
  const beforeDeletion=await db.query("select id,amount,occurred_at,account_id,merchant,type from public.transactions order by id");
  const totalsBefore=await report('2026-09-01','2026-10-01');
  await scalar("select public.delete_category_safely($1)",[parent]);
  check(Number(await scalar("select count(*) from public.categories where id=any($1::uuid[])",[[parent,child,grandchild]]))===0,"entire category subtree deleted");
  check(Number(await scalar("select count(*) from public.transactions where merchant='Preserved category transaction' and category_id=$1",[fallback]))===3,"all descendant transactions reassigned");
  assert.deepEqual((await db.query("select id,amount,occurred_at,account_id,merchant,type from public.transactions order by id")).rows,beforeDeletion.rows);checks++;
  check((await report('2026-09-01','2026-10-01')).expenses===totalsBefore.expenses,"historical expenses survive category deletion");
  check(Number(await scalar("select count(*) from public.merchant_rules where id=$1",[deleteRule]))===0,"referencing merchant rule removed");
  check(await scalar("select category_id from public.bills where id=$1",[bill])===fallback,"bill category reassigned");
  check(await scalar("select category_id from public.recurring_transactions where id=$1",[recurring])===fallback,"recurring category reassigned");
  check(Number(await scalar("select count(*) from public.budget_categories where budget_id=$1 and category_id=$2",[budget,fallback]))===1,"budget fallback link retained");
  check(Number(await scalar("select count(*) from public.categories where lower(name) like '%archived%'"))===0,"deletion creates no Archived category");
  const managedGoal=await scalar("insert into public.goals(name,target_amount) values('Delete goal',100) returning id");
  await db.query("update public.goals set name='Edited goal',target_date='2027-01-01',description='Edited description' where id=$1",[managedGoal]);
  check(await scalar("select name from public.goals where id=$1",[managedGoal])==='Edited goal',"goal edit persists");
  const managedContribution=await scalar("insert into public.goal_contributions(goal_id,source_account_id,linked_transaction_id,amount) values($1,$2,$3,100) returning id",[managedGoal,accountA,original]);
  check(Number(await scalar("select current_amount from public.goals where id=$1",[managedGoal]))===100,"managedContribution reaches goal");
  check(await scalar("select status from public.goals where id=$1",[managedGoal])==='completed',"reached goal completion status persists");
  await db.query("update public.goal_contributions set amount=150 where id=$1",[managedContribution]);
  check(Number(await scalar("select current_amount from public.goals where id=$1",[managedGoal]))===150,"edited managedContribution overfunds goal");
  await db.query("delete from public.goal_contributions where id=$1",[managedContribution]);
  check(Number(await scalar("select current_amount from public.goals where id=$1",[managedGoal]))===0,"deleting managedContribution recalculates progress");
  check(await scalar("select status from public.goals where id=$1",[managedGoal])==='active',"removing contribution reopens goal");
  await db.query("insert into public.goal_contributions(goal_id,source_account_id,linked_transaction_id,amount) values($1,$2,$3,80)",[managedGoal,accountA,original]);
  await asUser(b);
  await assert.rejects(db.query("select public.delete_goal_safely($1)",[managedGoal]),/not found/);checks++;
  await assert.rejects(db.query("select public.delete_category_safely($1)",[categoryA]),/not found/);checks++;
  check((await db.query("update public.accounts set is_active=false where id=$1 returning id",[accountA])).rows.length===0,"account status owner isolated");
  await asUser(a);
  await scalar("select public.delete_goal_safely($1)",[managedGoal]);
  check(Number(await scalar("select count(*) from public.goals where id=$1",[managedGoal]))===0,"goal really deleted");
  check(Number(await scalar("select count(*) from public.goal_contributions where goal_id=$1",[managedGoal]))===0,"goal allocations removed");
  assert.deepEqual((await db.query("select id,amount,occurred_at,account_id,merchant,type from public.transactions order by id")).rows,beforeDeletion.rows);checks++;
  await db.query("update public.accounts set is_active=false where id=$1",[accountA]);
  check(await scalar("select is_active from public.accounts where id=$1",[accountA])===false,"inactive status persisted");
  await assert.rejects(db.query("insert into public.transactions(account_id,type,amount) values($1,'expense',1)",[accountA]),/Reactivate/);checks++;
  await db.query("update public.transactions set notes='Historical edit while inactive' where id=$1",[original]);
  check((await search({account:accountA})).total>0,"inactive history query remains accessible");
  await db.query("update public.accounts set is_active=true where id=$1",[accountA]);
  check(await scalar("select is_active from public.accounts where id=$1",[accountA])===true,"reactivation persisted");
  const dailyPage=await search({dateFrom:'2026-09-12',dateTo:'2026-09-13',pageSize:1});
  check(Number(dailyPage.daily_totals['2026-09-12'])===-39,"daily total includes matching rows beyond current page");
  const receipt=await scalar("insert into storage.objects(bucket_id,name) values('receipts',$1) returning id",[a+"/receipts/synthetic.png"]);
  await asUser(b);
  check(Number(await scalar("select count(*) from storage.objects where id=$1",[receipt]))===0,"private receipt metadata isolated");
  await assert.rejects(db.query("insert into storage.objects(bucket_id,name) values('receipts',$1)",[a+"/receipts/forbidden.png"]));checks++;
  check(Number(await scalar("select count(*) from public.goals where id=$1",[goal]))===0,"goal isolation");
  check((await db.query("update public.bills set amount=1 where id=$1 returning id",[bill])).rows.length===0,"cross-owner bill update blocked by RLS");
  await assert.rejects(scalar("select public.save_budget_details($1,$2::jsonb,$3::uuid[])",[budget,JSON.stringify({name:"Forbidden",amount:"1",period:"monthly",threshold:80}),[]]));checks++;
  await db.exec("reset role");
  check(Number(await scalar("select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('transactions','goals','budgets','merchant_rules','imports','attachments') and c.relrowsecurity and c.relforcerowsecurity"))===6,"forced RLS intact");
  check(Number(await scalar("select count(*) from pg_trigger where tgrelid='auth.users'::regclass and not tgisinternal"))===1,"auth trigger untouched");
  check(await scalar("select bool_and(not has_function_privilege('anon',p.oid,'execute')) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('search_finance_transactions','finance_period_report','save_budget_details')"),"anonymous callers cannot execute owner RPCs");
  process.stdout.write(`PostgreSQL integration: ${migrations.length} migrations applied; ${checks} checks passed.\n`);
} catch (error) {
  process.stderr.write(`PostgreSQL integration failed: ${error.message} (${error.code ?? "assertion"})\n`);
  process.exitCode = 1;
} finally { await db.close(); }
