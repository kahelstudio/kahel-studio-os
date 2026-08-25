do $$
declare
  function_definition text;
begin
  select pg_get_functiondef(
    'public.prepare_payment_collection(uuid,text,text,text,bigint,text,jsonb,boolean,text,boolean,uuid)'::regprocedure
  ) into function_definition;

  if function_definition like '%select p.id, p.name, p.stock,%' then
    execute replace(
      function_definition,
      'select p.id, p.name, p.stock,',
      'select p.id as product_id, p.name, p.stock,'
    );
  end if;
end
$$;
