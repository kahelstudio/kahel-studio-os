-- Scorecard weights are immutable policy snapshots and must remain a complete allocation.
alter table public.employee_scorecards
  add constraint employee_scorecards_weights_range_check check (
    weight_leads_sales between 0 and 1
    and weight_responsibilities between 0 and 1
    and weight_quality_delivery between 0 and 1
    and weight_attendance between 0 and 1
    and weight_teamwork between 0 and 1
  ),
  add constraint employee_scorecards_weights_total_check check (
    weight_leads_sales + weight_responsibilities + weight_quality_delivery
      + weight_attendance + weight_teamwork = 1.00
  );

alter table public.employee_scorecards drop column final_score;

alter table public.employee_scorecards
  add column final_score numeric(5, 2) generated always as (
    case when
      score_leads_sales is not null and score_responsibilities is not null and
      score_quality_delivery is not null and score_attendance is not null and
      score_teamwork is not null
    then round(
      score_leads_sales * weight_leads_sales +
      score_responsibilities * weight_responsibilities +
      score_quality_delivery * weight_quality_delivery +
      score_attendance * weight_attendance +
      score_teamwork * weight_teamwork,
      2
    )
    else null end
  ) stored;
