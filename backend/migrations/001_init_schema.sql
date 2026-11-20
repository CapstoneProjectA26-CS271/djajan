-- 001_init_schema: enum, tabel, index, dan CHECK sesuai docs/DATA_MODEL.md.
-- Semua waktu timestamptz (UTC). Uang dalam integer rupiah.
-- Dijalankan dalam satu transaksi oleh scripts/migrate.js.

CREATE TYPE channel AS ENUM ('instagram', 'threads', 'whatsapp', 'facebook');
CREATE TYPE event_type AS ENUM ('page_view', 'menu_view', 'wa_click');

-- ===== Tabel inti (ditulis backend) =====

CREATE TABLE admins (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email           text UNIQUE NOT NULL,
  password_hash   text NOT NULL,
  failed_attempts int  NOT NULL DEFAULT 0,
  locked_until    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE menus (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text UNIQUE NOT NULL,           -- dipakai di URL & utm_campaign
  name          text NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  category      text NOT NULL,                  -- mis. 'makanan', 'minuman', 'snack'
  price         integer NOT NULL CHECK (price > 0),
  cost_price    integer CHECK (cost_price >= 0),-- opsional, untuk kalkulator promo
  description   text CHECK (length(description) <= 500),
  image_url     text,
  is_available  boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz                     -- soft delete agar histori event tetap utuh
);

CREATE TABLE captions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id         uuid NOT NULL REFERENCES menus(id),
  channel         channel NOT NULL,
  variant         char(1) NOT NULL CHECK (variant IN ('a','b','c')),
  style           text NOT NULL,                -- mis. 'fomo', 'cerita', 'promo'
  content         text NOT NULL,
  promo_price     integer,
  provider        text NOT NULL CHECK (provider IN ('gemini','groq','template')),
  utm_url         text NOT NULL,
  utm_content     text NOT NULL,                -- '<captionGroupId>-<variant>'
  feedback        text CHECK (feedback IN ('like','dislike','edited')),
  edited_content  text,
  group_id        uuid NOT NULL,                -- 3 varian dari satu permintaan berbagi group_id
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE events (
  id            bigserial PRIMARY KEY,
  session_id    text NOT NULL,                  -- acak, tanpa identitas
  event_type    event_type NOT NULL,
  menu_id       uuid REFERENCES menus(id),      -- null untuk page_view beranda
  utm_source    text NOT NULL DEFAULT 'direct',
  utm_medium    text,
  utm_campaign  text,
  utm_content   text,                           -- penanda varian caption
  is_synthetic  boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX events_created_at_idx ON events (created_at);
CREATE INDEX events_menu_type_idx  ON events (menu_id, event_type);
CREATE INDEX events_source_idx     ON events (utm_source, utm_content);

-- ===== Tabel hasil pipeline (ditulis ml-pipeline, dibaca backend) =====

CREATE TABLE forecast_runs (
  run_id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at     timestamptz NOT NULL DEFAULT now(),
  finished_at    timestamptz,
  status         text NOT NULL CHECK (status IN ('running','success','failed','insufficient_data')),
  data_days      int,                            -- jumlah hari data yang dipakai
  wape           numeric(6,4),                   -- error backtest (0.25 = 25%)
  used_synthetic boolean NOT NULL DEFAULT false,
  note           text
);

CREATE TABLE menu_forecast (
  run_id            uuid NOT NULL REFERENCES forecast_runs(run_id) ON DELETE CASCADE,
  menu_id           uuid NOT NULL REFERENCES menus(id),
  forecast_date     date NOT NULL,               -- tanggal Asia/Jakarta
  predicted_clicks  numeric(8,2) NOT NULL,
  trend_score       numeric(6,3),                -- >0 naik daun, <0 turun
  PRIMARY KEY (run_id, menu_id, forecast_date)
);

CREATE TABLE posting_time_stats (
  run_id          uuid NOT NULL REFERENCES forecast_runs(run_id) ON DELETE CASCADE,
  channel         text NOT NULL,                 -- utm_source
  hour            smallint NOT NULL CHECK (hour BETWEEN 0 AND 23),  -- jam Asia/Jakarta
  clicks          int NOT NULL,
  is_recommended  boolean NOT NULL DEFAULT false,
  PRIMARY KEY (run_id, channel, hour)
);
