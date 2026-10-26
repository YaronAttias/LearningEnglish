CREATE TABLE students (
  id TEXT PRIMARY KEY NOT NULL,
  label TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  revoked INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  last_seen INTEGER,
  meter_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE daily_usage (
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  active_ms INTEGER NOT NULL DEFAULT 0,
  answers INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (student_id, day)
);
--> statement-breakpoint
CREATE INDEX daily_usage_day ON daily_usage(day);
--> statement-breakpoint
CREATE TABLE reports (
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  received_at INTEGER NOT NULL,
  applied INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (student_id, event_id)
);
--> statement-breakpoint
CREATE INDEX reports_received ON reports(received_at);
