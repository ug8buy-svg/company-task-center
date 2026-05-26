-- ================================================================
-- 公司任務中心 — Supabase 資料庫結構
-- 指令編號：01
-- 建立日期：2026/05/26
-- ================================================================

-- 啟用 UUID 擴充套件
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- 表格一：users（使用者）
-- ================================================================
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email       TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('admin', 'boss', 'staff')),
  name        TEXT,
  line_id     TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- 表格二：boss_todos（老闆待辦清單）
-- ================================================================
CREATE TABLE boss_todos (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content     TEXT NOT NULL,
  is_done     BOOLEAN NOT NULL DEFAULT FALSE,
  done_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- 表格三：boss_notes（老闆專屬備注）
-- ================================================================
CREATE TABLE boss_notes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- 表格四：projects（專案）
-- ================================================================
CREATE TABLE projects (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           TEXT NOT NULL,
  status         TEXT NOT NULL CHECK (status IN ('進行中', '等待中', '卡關', '尚未開始')),
  latest_update  TEXT,
  next_deadline  DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- 表格五：milestones（里程碑）
-- ================================================================
CREATE TABLE milestones (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  is_done     BOOLEAN NOT NULL DEFAULT FALSE,
  done_at     TIMESTAMPTZ,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- 表格六：exhibitions（展覽設定）
-- ================================================================
CREATE TABLE exhibitions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                TEXT NOT NULL,
  event_date          DATE NOT NULL,
  notify_days_before  INTEGER NOT NULL DEFAULT 14,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- 表格七：checklists（展覽清點表）
-- ================================================================
CREATE TABLE checklists (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exhibition_id  UUID REFERENCES exhibitions(id),
  title          TEXT NOT NULL,
  is_archived    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- 表格八：checklist_items（清點品項）
-- ================================================================
CREATE TABLE checklist_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  checklist_id UUID NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  content      TEXT NOT NULL,
  is_done      BOOLEAN NOT NULL DEFAULT FALSE,
  done_at      TIMESTAMPTZ,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- 表格九：meetings（會議）
-- ================================================================
CREATE TABLE meetings (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title         TEXT NOT NULL,
  meeting_date  DATE NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- 表格十：meeting_entries（會議條目）
-- ================================================================
CREATE TABLE meeting_entries (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id       UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  content          TEXT NOT NULL,
  created_by       UUID REFERENCES users(id),
  created_by_name  TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- 表格十一：notification_settings（通知設定）
-- ================================================================
CREATE TABLE notification_settings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES users(id),
  line_user_id    TEXT,
  notify_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
