-- Enable necessary extensions if not already present
create extension if not exists "uuid-ossp";

-- Garages table (Represents independent repair shops / tenant accounts)
create table if not exists public.garages (
    id uuid primary key default uuid_generate_v4(),
    name text not null default 'Independent Workshop',
    email text unique,
    phone text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Jobs table (Represents an active or completed vehicle repair session in a bay)
create table if not exists public.jobs (
    id uuid primary key default uuid_generate_v4(),
    garage_id uuid references public.garages(id) on delete cascade not null,
    registration_plate text not null,
    vehicle_make_model text default 'Standard Vehicle',
    customer_name text,
    customer_phone text,
    customer_email text,
    mechanic_notes text,
    status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
    completed_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Job Images table (Stores photo evidence captured directly from the bay)
create table if not exists public.job_images (
    id uuid primary key default uuid_generate_v4(),
    job_id uuid references public.jobs(id) on delete cascade not null,
    image_url text not null,
    caption text default 'Bay inspection photo',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indexes for lightning-fast queries and filtering
create index if not exists idx_jobs_garage_id on public.jobs(garage_id);
create index if not exists idx_jobs_status on public.jobs(status);
create index if not exists idx_jobs_reg on public.jobs(registration_plate);
create index if not exists idx_job_images_job_id on public.job_images(job_id);

-- Seed a default demo garage for local testing / MVP initialization
insert into public.garages (id, name, email, phone)
values (
    '00000000-0000-0000-0000-000000000001',
    'Garage Lab Test Workshop',
    'support@garagelab.test',
    '01275 000000'
)
on conflict (id) do nothing;