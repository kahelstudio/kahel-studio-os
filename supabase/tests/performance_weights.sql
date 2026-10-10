begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into public.payroll_employees (
  id, initials, name, role, employee_ref, daily_rate_centavos, employment_type
) values (
  '61000000-0000-4000-8000-000000000001', 'PW', 'Performance Weight Test',
  'Tester', 'PWT-001', 70000, 'full_time'
);

insert into public.performance_cycles (id, cycle_month, label)
values ('61100000-0000-4000-8000-000000000001', '2099-01-01', 'Weight Test Cycle');

insert into public.employee_scorecards (
  id, cycle_id, employee_id, daily_rate_snapshot_centavos, employment_type_snapshot,
  employee_name_snapshot, employee_role_snapshot, score_leads_sales,
  score_responsibilities, score_quality_delivery, score_attendance, score_teamwork
) values (
  '61200000-0000-4000-8000-000000000001', '61100000-0000-4000-8000-000000000001',
  '61000000-0000-4000-8000-000000000001', 70000, 'full_time',
  'Performance Weight Test', 'Tester', 80, 70, 90, 100, 60
);

select is(
  (select final_score from public.employee_scorecards where id = '61200000-0000-4000-8000-000000000001'),
  80.00::numeric, 'default 35/30/20/10/5 weights preserve the existing score'
);

update public.employee_scorecards set
  score_leads_sales = 81.11, score_responsibilities = 72.22,
  score_quality_delivery = 93.33, score_attendance = 64.44, score_teamwork = 55.55,
  weight_leads_sales = 0.10, weight_responsibilities = 0.20,
  weight_quality_delivery = 0.30, weight_attendance = 0.20, weight_teamwork = 0.20
where id = '61200000-0000-4000-8000-000000000001';
select is(
  (select final_score from public.employee_scorecards where id = '61200000-0000-4000-8000-000000000001'),
  74.55::numeric, 'custom weights calculate and round the score to two decimals'
);

update public.employee_scorecards set
  score_leads_sales = 100, score_responsibilities = 80,
  score_quality_delivery = 60, score_attendance = 40, score_teamwork = 20,
  weight_leads_sales = 0, weight_responsibilities = 0.25,
  weight_quality_delivery = 0.25, weight_attendance = 0.25, weight_teamwork = 0.25
where id = '61200000-0000-4000-8000-000000000001';
select is(
  (select final_score from public.employee_scorecards where id = '61200000-0000-4000-8000-000000000001'),
  50.00::numeric, 'zero category weights are allowed when the total remains exactly one'
);

select throws_ok($$
  update public.employee_scorecards set
    weight_leads_sales = 0.10, weight_responsibilities = 0.20,
    weight_quality_delivery = 0.30, weight_attendance = 0.20, weight_teamwork = 0.10
  where id = '61200000-0000-4000-8000-000000000001'
$$, '23514', null, 'weights totaling less than one are rejected');

select throws_ok($$
  update public.employee_scorecards set
    weight_leads_sales = 0.30, weight_responsibilities = 0.30,
    weight_quality_delivery = 0.30, weight_attendance = 0.20, weight_teamwork = 0.10
  where id = '61200000-0000-4000-8000-000000000001'
$$, '23514', null, 'weights totaling more than one are rejected');

select * from finish();
rollback;
