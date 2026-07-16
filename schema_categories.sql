CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO categories (id, label, sort_order) VALUES
  ('gaming', 'Gaming', 0),
  ('decoracion', 'Decoración', 1),
  ('accesorios', 'Accesorios', 2),
  ('personalizados', 'Personalizados', 3);
