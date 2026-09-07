begin;
create extension if not exists pgtap with schema extensions;
select extensions.no_plan();

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data)
values
('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','a@rls.test','',now(),now(),now(),'{}','{"display_name":"User A"}'),
('20000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','b@rls.test','',now(),now(),now(),'{}','{"display_name":"User B"}');

select extensions.is(
  (select count(*) from public.profiles where id in ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002')),
  2::bigint,
  'Auth bootstrap creates one profile per user'
);
select extensions.is(
  (select count(*) from public.notification_preferences where user_id in ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002')),
  2::bigint,
  'Auth bootstrap creates notification preferences'
);
select extensions.is(
  (select count(*) from public.dashboard_preferences where user_id in ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002')),
  2::bigint,
  'Auth bootstrap creates dashboard preferences'
);
select extensions.is(
  (select count(*) from public.ai_settings where user_id in ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002')),
  2::bigint,
  'Auth bootstrap creates AI settings'
);
select extensions.is(
  (select count(*) from public.categories where user_id in ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002')),
  20::bigint,
  'Auth bootstrap creates default categories plus protected Uncategorized without evaluating account fields'
);

select extensions.ok(
  has_schema_privilege('authenticated', 'public', 'usage'),
  'Authenticated users can access the public API schema'
);
select extensions.is(
  (select count(*) from unnest(array['profiles','accounts','categories','transactions','budgets','budget_categories','goals','recurring_transactions','subscriptions','bills','account_balances']) as expected(table_name)
    where has_table_privilege('authenticated', format('public.%I', table_name), 'select')),
  11::bigint,
  'Authenticated users can read every table used to load the finance workspace'
);
select extensions.is(
  (select count(*) from unnest(array['accounts','categories','transactions','budgets','budget_categories','goals','recurring_transactions','subscriptions','bills']) as expected(table_name)
    where has_table_privilege('authenticated', format('public.%I', table_name), 'insert')),
  9::bigint,
  'Authenticated users can insert only the finance records created by the application'
);
select extensions.is(
  (select count(*) from unnest(array['profiles','accounts','categories','transactions']) as expected(table_name)
    where has_table_privilege('authenticated', format('public.%I', table_name), 'update')),
  4::bigint,
  'Authenticated users can update the finance records edited by the application'
);
select extensions.ok(
  has_table_privilege('authenticated', 'public.transactions', 'delete'),
  'Authenticated users can delete transactions through owner-scoped RLS'
);
select extensions.ok(
  has_table_privilege('authenticated', 'public.accounts', 'delete'),
  'Authenticated users can delete only their own unreferenced accounts through owner-scoped RLS'
);
select extensions.ok(
  has_table_privilege('authenticated', 'public.goal_contributions', 'select,insert,update,delete'),
  'Authenticated users can manage owner-scoped goal contributions'
);
select extensions.ok(
  has_table_privilege('authenticated', 'public.imports', 'select,insert,update'),
  'Authenticated users can manage owner-scoped import history'
);
select extensions.ok(
  has_table_privilege('authenticated', 'public.import_rows', 'select,insert,update,delete'),
  'Authenticated users can manage owner-scoped import review rows'
);
select extensions.ok(
  has_table_privilege('authenticated', 'public.merchant_rules', 'select,insert,update,delete'),
  'Authenticated users can manage their deterministic merchant rules'
);
select extensions.ok(
  has_table_privilege('authenticated', 'public.attachments', 'select,insert,update,delete'),
  'Authenticated users can manage private receipt metadata'
);

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
insert into public.accounts(id,name,type) values('10000000-0000-0000-0000-000000000011','A bank','bank');
insert into public.transactions(id,account_id,type,amount,occurred_at,merchant) values('10000000-0000-0000-0000-000000000012','10000000-0000-0000-0000-000000000011','expense',100,now(),'A merchant');
insert into public.transactions(id,account_id,type,amount,occurred_at,merchant,refund_of_id) values('10000000-0000-0000-0000-000000000023','10000000-0000-0000-0000-000000000011','refund',30,now(),'A merchant refund','10000000-0000-0000-0000-000000000012');
select extensions.throws_ok(
  $$insert into public.transactions(account_id,type,amount,occurred_at,merchant,refund_of_id) values('10000000-0000-0000-0000-000000000011','refund',80,now(),'Excess refund','10000000-0000-0000-0000-000000000012')$$,
  'Refund total cannot exceed the original purchase', 'Aggregate refunds cannot exceed their purchase'
);
insert into public.accounts(id,name,type,opening_balance,original_principal,emi_amount,interest_rate,next_payment_date) values('10000000-0000-0000-0000-000000000024','A home loan','loan',3800,5000,420,8.5,current_date);
insert into public.transactions(id,account_id,transfer_account_id,type,amount,occurred_at,merchant,metadata) values('10000000-0000-0000-0000-000000000025','10000000-0000-0000-0000-000000000011','10000000-0000-0000-0000-000000000024','transfer',420,now(),'Loan EMI','{"loan_principal":"300.00","loan_interest":"120.00"}');
select extensions.is((select balance from public.account_balances where id='10000000-0000-0000-0000-000000000024'),3500::numeric,'Only the principal portion of an EMI reduces loan outstanding');
select extensions.is((select gross_spending from public.monthly_financial_summary(date_trunc('month',current_date)::date)),220::numeric,'Loan interest, but not principal, is included in spending');
insert into public.budgets(id,name,limit_amount,period) values('10000000-0000-0000-0000-000000000013','A budget',500,'monthly');
insert into public.goals(id,name,target_amount) values('10000000-0000-0000-0000-000000000014','A goal',1000);
insert into public.goal_contributions(id,goal_id,amount,source_account_id,notes) values('10000000-0000-0000-0000-000000000022','10000000-0000-0000-0000-000000000014',250,'10000000-0000-0000-0000-000000000011','First allocation');
select extensions.is((select current_amount from public.goals where id='10000000-0000-0000-0000-000000000014'),250::numeric,'Contribution insert recalculates goal progress');
insert into public.attachments(id,transaction_id,storage_path,file_name,content_type,size_bytes) values('10000000-0000-0000-0000-000000000015','10000000-0000-0000-0000-000000000012','10000000-0000-0000-0000-000000000001/receipts/receipt.png','receipt.png','image/png',100);
insert into public.imports(id,account_id,file_name,file_type) values('10000000-0000-0000-0000-000000000016','10000000-0000-0000-0000-000000000011','a.csv','csv');
insert into public.subscriptions(id,account_id,merchant,title,estimated_amount) values('10000000-0000-0000-0000-000000000017','10000000-0000-0000-0000-000000000011','Stream','Stream',10);
insert into public.recurring_transactions(id,account_id,title,amount,type,frequency,start_date,next_date) values('10000000-0000-0000-0000-000000000018','10000000-0000-0000-0000-000000000011','Rent',200,'expense','monthly',current_date,current_date);
insert into public.saved_filters(id,name,filters) values('10000000-0000-0000-0000-000000000019','Large','{"min":100}');
insert into public.merchant_rules(id,pattern,merchant_normalized) values('10000000-0000-0000-0000-000000000020','A merchant','a merchant');

select set_config('request.jwt.claims','{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
select extensions.is((select count(*) from public.accounts where id='10000000-0000-0000-0000-000000000011'),0::bigint,'B cannot select A account');
select extensions.is((select count(*) from public.account_balances where id='10000000-0000-0000-0000-000000000011'),0::bigint,'B cannot select A account balance');
select extensions.is((select count(*) from public.profiles where id='10000000-0000-0000-0000-000000000001'),0::bigint,'B cannot select A profile');
select extensions.is((select count(*) from public.categories where user_id='10000000-0000-0000-0000-000000000001'),0::bigint,'B cannot select A categories');
select extensions.is((select count(*) from public.transactions where id='10000000-0000-0000-0000-000000000012'),0::bigint,'B cannot select A transaction');
select extensions.is((select count(*) from public.budgets where id='10000000-0000-0000-0000-000000000013'),0::bigint,'B cannot select A budget');
select extensions.is((select count(*) from public.goals where id='10000000-0000-0000-0000-000000000014'),0::bigint,'B cannot select A goal');
select extensions.is((select count(*) from public.goal_contributions where id='10000000-0000-0000-0000-000000000022'),0::bigint,'B cannot select A goal contribution');
select extensions.is((select count(*) from public.attachments where id='10000000-0000-0000-0000-000000000015'),0::bigint,'B cannot select A attachment');
select extensions.is((select count(*) from public.imports where id='10000000-0000-0000-0000-000000000016'),0::bigint,'B cannot select A import');
select extensions.is((select count(*) from public.subscriptions where id='10000000-0000-0000-0000-000000000017'),0::bigint,'B cannot select A subscription');
select extensions.is((select count(*) from public.recurring_transactions where id='10000000-0000-0000-0000-000000000018'),0::bigint,'B cannot select A recurring transaction');
select extensions.is((select count(*) from public.saved_filters where id='10000000-0000-0000-0000-000000000019'),0::bigint,'B cannot select A saved filter');
select extensions.is((select count(*) from public.merchant_rules where id='10000000-0000-0000-0000-000000000020'),0::bigint,'B cannot select A merchant rule');

update public.transactions set amount=999 where id='10000000-0000-0000-0000-000000000012';
delete from public.transactions where id='10000000-0000-0000-0000-000000000012';
update public.accounts set name='Cross-user update' where id='10000000-0000-0000-0000-000000000011';
delete from public.accounts where id='10000000-0000-0000-0000-000000000011';
update public.goal_contributions set amount=999 where id='10000000-0000-0000-0000-000000000022';
delete from public.goal_contributions where id='10000000-0000-0000-0000-000000000022';
update public.imports set status='cancelled' where id='10000000-0000-0000-0000-000000000016';
delete from public.merchant_rules where id='10000000-0000-0000-0000-000000000020';
delete from public.attachments where id='10000000-0000-0000-0000-000000000015';
select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
select extensions.is((select amount from public.transactions where id='10000000-0000-0000-0000-000000000012'),100::numeric,'B cannot update A transaction');
select extensions.is((select count(*) from public.transactions where id='10000000-0000-0000-0000-000000000012'),1::bigint,'B cannot delete A transaction');
select extensions.is((select name from public.accounts where id='10000000-0000-0000-0000-000000000011'),'A bank','B cannot update A account');
select extensions.is((select count(*) from public.accounts where id='10000000-0000-0000-0000-000000000011'),1::bigint,'B cannot delete A account');
select extensions.is((select amount from public.goal_contributions where id='10000000-0000-0000-0000-000000000022'),250::numeric,'B cannot update or delete A contribution');
select extensions.is((select status from public.imports where id='10000000-0000-0000-0000-000000000016'),'uploaded'::public.import_status,'B cannot update A import');
select extensions.is((select count(*) from public.merchant_rules where id='10000000-0000-0000-0000-000000000020'),1::bigint,'B cannot delete A merchant rule');
select extensions.is((select count(*) from public.attachments where id='10000000-0000-0000-0000-000000000015'),1::bigint,'B cannot delete A receipt metadata');

insert into public.categories(id,name,icon,color,kind,is_default) values('10000000-0000-0000-0000-000000000026','Temporary import category','Circle','#112233','expense',false);
insert into public.categories(id,parent_id,name,icon,color,kind,is_default) values('10000000-0000-0000-0000-000000000029','10000000-0000-0000-0000-000000000026','Preserved child category','Circle','#223344','expense',false);
insert into public.transactions(id,account_id,category_id,type,amount,occurred_at,merchant) values('10000000-0000-0000-0000-000000000027','10000000-0000-0000-0000-000000000011','10000000-0000-0000-0000-000000000026','expense',50,now(),'Rule merchant');
insert into public.merchant_rules(id,pattern,merchant_normalized,category_id) values('10000000-0000-0000-0000-000000000028','Rule merchant','rule merchant','10000000-0000-0000-0000-000000000026');
select public.archive_category_safely('10000000-0000-0000-0000-000000000026');
select extensions.is(
  (select category.name from public.transactions as txn join public.categories as category on category.id=txn.category_id where txn.id='10000000-0000-0000-0000-000000000027'),
  'Uncategorized',
  'Archiving a custom category preserves transaction history in Uncategorized'
);
select extensions.is((select enabled from public.merchant_rules where id='10000000-0000-0000-0000-000000000028'),false,'Archiving a category safely disables affected merchant rules');
select extensions.ok((select archived_at is not null from public.categories where id='10000000-0000-0000-0000-000000000026'),'Custom category is archived rather than deleted');
select extensions.is((select parent_id from public.categories where id='10000000-0000-0000-0000-000000000029'),null::uuid,'A child category is preserved and promoted when its parent is archived');
select extensions.throws_ok(
  $$update public.categories set archived_at=now() where lower(name)='uncategorized'$$,
  'Uncategorized is a protected system category',
  'Protected Uncategorized cannot be archived'
);
select extensions.throws_ok(
  $$delete from public.categories where lower(name)='uncategorized'$$,
  'Uncategorized is a protected system category',
  'Protected Uncategorized cannot be deleted'
);

select set_config('request.jwt.claims','{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
select extensions.throws_ok(
  $$insert into public.transactions(account_id,type,amount,occurred_at,merchant) values('10000000-0000-0000-0000-000000000011','expense',1,now(),'Cross owner')$$,
  'Account is not owned by current user', 'B cannot link a transaction to A account'
);
select extensions.throws_ok(
  $$insert into public.goal_contributions(goal_id,amount,source_account_id) values('10000000-0000-0000-0000-000000000014',1,'10000000-0000-0000-0000-000000000011')$$,
  'Goal is not owned by current user', 'B cannot contribute to A goal or account'
);
insert into public.accounts(id,user_id,name,type) values('20000000-0000-0000-0000-000000000021','10000000-0000-0000-0000-000000000001','B own enforced','cash');
select extensions.is((select user_id from public.accounts where id='20000000-0000-0000-0000-000000000021'),'20000000-0000-0000-0000-000000000002'::uuid,'Owner trigger ignores spoofed user_id');
delete from public.accounts where id='20000000-0000-0000-0000-000000000021';
select extensions.is((select count(*) from public.accounts where id='20000000-0000-0000-0000-000000000021'),0::bigint,'Owner can delete an account with no dependent records');

set local role anon;
select extensions.throws_ok(
  $$delete from public.accounts where id='10000000-0000-0000-0000-000000000011'$$,
  '42501', null, 'Unauthenticated users have no account delete privilege'
);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
select extensions.throws_ok(
  $$delete from public.accounts where id='10000000-0000-0000-0000-000000000011'$$,
  '23503', null, 'An account with financial history cannot be destructively deleted'
);
update public.goal_contributions set amount=300 where id='10000000-0000-0000-0000-000000000022';
select extensions.is((select current_amount from public.goals where id='10000000-0000-0000-0000-000000000014'),300::numeric,'Contribution edit recalculates goal progress');
delete from public.goal_contributions where id='10000000-0000-0000-0000-000000000022';
select extensions.is((select current_amount from public.goals where id='10000000-0000-0000-0000-000000000014'),0::numeric,'Contribution removal reverses goal progress without deleting financial history');

select extensions.is(
  (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=any(array['profiles','accounts','categories','imports','recurring_transactions','subscriptions','transactions','import_rows','tags','transaction_tags','attachments','budgets','budget_categories','goals','goal_contributions','bills','merchant_rules','saved_filters','notifications','notification_preferences','dashboard_preferences','ai_settings','audit_logs']) and c.relrowsecurity),
  23::bigint,
  'RLS is enabled on every user-owned public table'
);
select extensions.is(
  (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=any(array['profiles','accounts','categories','imports','recurring_transactions','subscriptions','transactions','import_rows','tags','transaction_tags','attachments','budgets','budget_categories','goals','goal_contributions','bills','merchant_rules','saved_filters','notifications','notification_preferences','dashboard_preferences','ai_settings','audit_logs']) and c.relforcerowsecurity),
  23::bigint,
  'RLS is forced on every user-owned public table'
);
select extensions.is(
  (select count(*) from pg_policies where schemaname='storage' and tablename='objects' and policyname like 'receipts_%_own'),
  4::bigint,
  'Private receipt storage has select, insert, update, and delete owner policies'
);

select * from extensions.finish();
rollback;
