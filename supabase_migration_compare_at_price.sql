-- Precio anterior para ofertas (badge + tachado cuando compare_at_price > price)
alter table public.products
  add column if not exists compare_at_price numeric(12, 2);

comment on column public.products.compare_at_price is
  'Precio anterior opcional. Si es mayor que price, la UI muestra Oferta y precio tachado.';
