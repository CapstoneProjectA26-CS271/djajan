-- 003_synthetic_loader: role untuk generator data sintetis (DS-1), lihat "Hak akses database" di docs/DATA_MODEL.md.
--
-- Role ini boleh INSERT dan DELETE di events, tetapi trigger di bawah menjamin ia hanya menyentuh data sintetis:
-- setiap baris yang ia tulis dipaksa is_synthetic = true, dan DELETE atas baris non-sintetis (event pengunjung
-- riil) membatalkan seluruh statement. Tidak ada UPDATE, TRUNCATE, atau akses ke tabel lain selain SELECT menus.
-- Password diisi scripts/migrate.js dari env SYNTHETIC_LOADER_DB_PASSWORD (aturan sama dengan 002_roles.sql).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'synthetic_loader') THEN
    CREATE ROLE synthetic_loader LOGIN;
  END IF;
END
$$;

ALTER ROLE synthetic_loader WITH LOGIN PASSWORD {{SYNTHETIC_LOADER_DB_PASSWORD}};

GRANT USAGE ON SCHEMA public TO synthetic_loader;
GRANT SELECT ON menus TO synthetic_loader;
-- SELECT dibutuhkan untuk DELETE ... WHERE is_synthetic dan INSERT ... RETURNING.
GRANT SELECT, INSERT, DELETE ON events TO synthetic_loader;
GRANT USAGE ON SEQUENCE events_id_seq TO synthetic_loader;

-- Bukan SECURITY DEFINER: current_user adalah role yang menjalankan statement.
CREATE FUNCTION guard_synthetic_loader_events() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF current_user <> 'synthetic_loader' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.is_synthetic := true;
    RETURN NEW;
  END IF;

  IF NOT OLD.is_synthetic THEN
    RAISE EXCEPTION 'synthetic_loader hanya boleh menghapus event sintetis (event id %)', OLD.id
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN OLD;
END
$$;

-- Trigger function tidak perlu bisa dipanggil langsung oleh siapa pun.
REVOKE ALL ON FUNCTION guard_synthetic_loader_events() FROM PUBLIC;

CREATE TRIGGER events_synthetic_loader_guard
  BEFORE INSERT OR DELETE ON events
  FOR EACH ROW EXECUTE FUNCTION guard_synthetic_loader_events();

-- Supabase: role Data API tidak boleh memanggil function ini (default privileges sudah dicabut di 002).
DO $$
DECLARE
  api_role text;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL ON FUNCTION guard_synthetic_loader_events() FROM %I', api_role);
    END IF;
  END LOOP;
END
$$;
