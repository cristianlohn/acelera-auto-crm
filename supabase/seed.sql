-- Insere uma organização demonstrativa
insert into public.organizations (id, name, slug, document)
values (
  'a0000000-0000-0000-0000-000000000001',
  'Acelera Auto Matriz',
  'acelera-auto-matriz',
  '12.345.678/0001-90'
) on conflict do nothing;

-- Insere veículos de demonstração
insert into public.vehicles (
  organization_id, make, model, version, year_fab, year_model, price, mileage, plate_last_digits, color, fuel, transmission, status, photo_url
) values
  ('a0000000-0000-0000-0000-000000000001', 'Honda', 'Civic', 'EXL 2.0 CVT', 2022, 2023, 149900, 28500, 'BRA2E22', 'Cinza Chumbo', 'flex', 'cvt', 'disponivel', 'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?w=800&auto=format&fit=crop&q=80'),
  ('a0000000-0000-0000-0000-000000000001', 'Toyota', 'Corolla Cross', 'XRE 2.0 Flex', 2023, 2024, 168900, 18200, 'ABC3D44', 'Branco Pérola', 'flex', 'automatico', 'reservado', 'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=800&auto=format&fit=crop&q=80'),
  ('a0000000-0000-0000-0000-000000000001', 'Jeep', 'Compass', 'Longitude 1.3 Turbo', 2021, 2022, 134900, 45000, 'XYZ9K88', 'Preto Carbon', 'flex', 'automatico', 'disponivel', 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=80');

-- Insere leads de demonstração
insert into public.leads (
  organization_id, name, phone, email, vehicle_interest, status, seller_name, origin, last_contact_at
) values
  ('a0000000-0000-0000-0000-000000000001', 'Carlos Mendonça', '11987654321', 'carlos@exemplo.com', 'Honda Civic EXL 2023', 'novo', 'Rafael Alves', 'whatsapp', now() - interval '2 hours'),
  ('a0000000-0000-0000-0000-000000000001', 'Fernanda Souza', '21976543210', 'fernanda@exemplo.com', 'Toyota Corolla Cross', 'atendimento', 'Camila Dias', 'instagram', now() - interval '8 hours'),
  ('a0000000-0000-0000-0000-000000000001', 'Ricardo Lima', '11965432109', 'ricardo@exemplo.com', 'Jeep Compass Longitude', 'proposta', 'Rafael Alves', 'site', now() - interval '30 hours');