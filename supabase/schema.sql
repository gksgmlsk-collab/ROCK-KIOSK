
create extension if not exists pgcrypto;
create type lap_range as enum ('1_2','3_5','6_9','10_PLUS');
create table students(id uuid primary key default gen_random_uuid(),status text not null default 'active',created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table student_enrollments(id uuid primary key default gen_random_uuid(),student_id uuid not null references students(id) on delete cascade,school_year int not null,grade int not null check(grade between 1 and 6),class_no int not null check(class_no>0),student_no int not null check(student_no>0),is_active boolean not null default true,created_at timestamptz not null default now(),unique(school_year,grade,class_no,student_no));
create table student_credentials(student_id uuid primary key references students(id) on delete cascade,pin_hash text, pin_setup_completed boolean not null default false,registration_code_hash text,registration_code_used boolean not null default false,failed_attempts int not null default 0,locked_until timestamptz,updated_at timestamptz not null default now());
create table student_consents(student_id uuid primary key references students(id) on delete cascade,guardian_consent_verified boolean not null default false,notice_confirmed boolean not null default false,notice_version text,notice_confirmed_at timestamptz);
create table walking_records(id uuid primary key default gen_random_uuid(),student_id uuid not null references students(id) on delete cascade,record_date date not null default current_date,lap_range lap_range not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(student_id,record_date));
alter table students enable row level security;alter table student_enrollments enable row level security;alter table student_credentials enable row level security;alter table student_consents enable row level security;alter table walking_records enable row level security;
-- 모든 학생 인증/PIN 검증/기록 저장은 service role을 사용하는 Edge Function에서 수행한다.
-- 브라우저 anon role에는 테이블 직접 접근 정책을 만들지 않는다.
