grant select, insert on table
  public.staff_audit_log,
  public.customer_audit_log
to service_role;

grant select on table
  public.loyalty_audit_log,
  public.approval_audit_log
to service_role;

grant usage, select on sequence public.staff_audit_log_id_seq to service_role;
