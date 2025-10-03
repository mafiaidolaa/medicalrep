-- Performance indexes for Supabase (PostgreSQL)
-- Safe to run multiple times (IF NOT EXISTS)

-- USERS
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users (username);
CREATE INDEX IF NOT EXISTS idx_users_full_name ON public.users (full_name);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users (created_at);

-- CLINICS
CREATE INDEX IF NOT EXISTS idx_clinics_name ON public.clinics (name);
CREATE INDEX IF NOT EXISTS idx_clinics_area ON public.clinics (area);
CREATE INDEX IF NOT EXISTS idx_clinics_line ON public.clinics (line);
CREATE INDEX IF NOT EXISTS idx_clinics_registered_at ON public.clinics (registered_at);

-- PRODUCTS
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products (name);
CREATE INDEX IF NOT EXISTS idx_products_line ON public.products (line);

-- ORDERS
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at);
CREATE INDEX IF NOT EXISTS idx_orders_clinic_id ON public.orders (clinic_id);
CREATE INDEX IF NOT EXISTS idx_orders_representative_id ON public.orders (representative_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);

-- VISITS
CREATE INDEX IF NOT EXISTS idx_visits_visit_date ON public.visits (visit_date);
CREATE INDEX IF NOT EXISTS idx_visits_clinic_id ON public.visits (clinic_id);
CREATE INDEX IF NOT EXISTS idx_visits_representative_id ON public.visits (representative_id);

-- COLLECTIONS
CREATE INDEX IF NOT EXISTS idx_collections_created_at ON public.collections (created_at);
CREATE INDEX IF NOT EXISTS idx_collections_clinic_id ON public.collections (clinic_id);
CREATE INDEX IF NOT EXISTS idx_collections_representative_id ON public.collections (representative_id);

-- EXPENSES
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON public.expenses (created_at);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON public.expenses (created_by);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON public.expenses (status);

-- ACTIVITY LOG
CREATE INDEX IF NOT EXISTS idx_activity_log_timestamp ON public.activity_log (timestamp);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON public.activity_log (user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON public.activity_log (entity_type, entity_id);

-- NOTIFICATIONS
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications (created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications (read);

-- PLAN TASKS
CREATE INDEX IF NOT EXISTS idx_plan_tasks_assigned_to ON public.plan_tasks (assigned_to);
CREATE INDEX IF NOT EXISTS idx_plan_tasks_due_date ON public.plan_tasks (due_date);
CREATE INDEX IF NOT EXISTS idx_plan_tasks_status ON public.plan_tasks (status);
