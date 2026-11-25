-- 002_roles: role aplikasi dan hak aksesnya sesuai tabel "Hak akses database" di docs/DATA_MODEL.md.
--
-- Password TIDAK ditulis di file ini. Placeholder (nama env diapit kurung kurawal ganda) diisi oleh scripts/migrate.js dari
-- env APP_BACKEND_DB_PASSWORD / FORECAST_JOB_DB_PASSWORD (di-escape sebagai literal SQL). Untuk database
-- non-lokal kedua env wajib diisi; runner berhenti sebelum migrasi apa pun dijalankan bila kosong. Hanya untuk
-- localhost env boleh kosong: baris itu dilewati dengan peringatan dan role dibuat tanpa password.
-- Placeholder hanya boleh muncul di statement satu baris.

-- ===== Buat role (idempotent: role berlaku untuk seluruh cluster, bukan per database) =====

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_backend') THEN
    CREATE ROLE app_backend LOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'forecast_job') THEN
    CREATE ROLE forecast_job LOGIN;
  END IF;
END
$$;

ALTER ROLE app_backend WITH LOGIN PASSWORD {{APP_BACKEND_DB_PASSWORD}};
ALTER ROLE forecast_job WITH LOGIN PASSWORD {{FORECAST_JOB_DB_PASSWORD}};

GRANT USAGE ON SCHEMA public TO app_backend, forecast_job;

-- ===== app_backend: CRUD tabel inti; SELECT tabel hasil pipeline =====

GRANT SELECT, INSERT, UPDATE, DELETE ON admins, menus, captions, events TO app_backend;
GRANT USAGE ON SEQUENCE events_id_seq TO app_backend;
GRANT SELECT ON forecast_runs, menu_forecast, posting_time_stats TO app_backend;

-- ===== forecast_job: baca data mentah; tulis hasil pipeline =====

GRANT SELECT ON events, menus TO forecast_job;
-- SELECT ikut diberikan karena UPDATE ... WHERE, INSERT ... RETURNING, dan ON CONFLICT DO UPDATE
-- membutuhkan hak baca pada tabel yang sama. Tidak ada DELETE.
GRANT SELECT, INSERT, UPDATE ON forecast_runs, menu_forecast, posting_time_stats TO forecast_job;

-- ===== Supabase: tutup akses Data API (PostgREST) ke tabel aplikasi =====
-- Supabase otomatis memberi hak tabel baru di schema public ke role anon & authenticated, sehingga tabel
-- (termasuk admins.password_hash) bisa dibaca lewat anon key. Semua akses data wajib lewat backend.
-- Default privileges juga dicabut agar tabel, sequence, dan function baru tidak otomatis terbuka.
-- Di Postgres lokal role ini tidak ada, jadi blok ini tidak melakukan apa pun.

DO $$
DECLARE
  api_role text;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format(
        'REVOKE ALL ON admins, menus, captions, events, forecast_runs, menu_forecast, posting_time_stats FROM %I',
        api_role);
      EXECUTE format('REVOKE ALL ON SEQUENCE events_id_seq FROM %I', api_role);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', api_role);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', api_role);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM %I', api_role);
    END IF;
  END LOOP;
END
$$;
