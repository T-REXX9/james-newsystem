-- Create views for Sales Report aggregation
-- This migration creates database views for efficient sales reporting

-- View: Unified sales transactions from multiple sources
CREATE OR REPLACE VIEW public.v_sales_transactions AS
SELECT 
    sr.id,
    'sales_report' as source_type,
    sr.contact_id,
    c.first_name || ' ' || c.last_name as customer_name,
    c.company as customer_company,
    sr.date::timestamp as transaction_date,
    sr.total_amount,
    sr.currency,
    sr.sales_agent as agent_name,
    NULL::uuid as agent_id,
    sr.approval_status as status,
    sr.products,
    sr.notes,
    sr.created_at
FROM public.sales_reports sr
LEFT JOIN public.contacts c ON sr.contact_id = c.id
WHERE sr.is_deleted = false OR sr.is_deleted IS NULL

UNION ALL

SELECT 
    so.id,
    'sales_order' as source_type,
    so.contact_id,
    c.first_name || ' ' || c.last_name as customer_name,
    c.company as customer_company,
    so.created_at as transaction_date,
    so.total_amount,
    'PHP' as currency,
    p.full_name as agent_name,
    so.created_by as agent_id,
    so.status,
    (
        SELECT jsonb_agg(jsonb_build_object(
            'name', pr.name,
            'quantity', soi.quantity,
            'price', soi.unit_price
        ))
        FROM public.sales_order_items soi
        LEFT JOIN public.products pr ON soi.product_id = pr.id
        WHERE soi.sales_order_id = so.id
    ) as products,
    so.notes,
    so.created_at
FROM public.sales_orders so
LEFT JOIN public.contacts c ON so.contact_id = c.id
LEFT JOIN public.profiles p ON so.created_by = p.id
WHERE so.is_deleted = false OR so.is_deleted IS NULL

UNION ALL

SELECT 
    inv.id,
    'invoice' as source_type,
    inv.contact_id,
    c.first_name || ' ' || c.last_name as customer_name,
    c.company as customer_company,
    inv.created_at as transaction_date,
    inv.total_amount,
    'PHP' as currency,
    p.full_name as agent_name,
    inv.created_by as agent_id,
    inv.status,
    (
        SELECT jsonb_agg(jsonb_build_object(
            'name', pr.name,
            'quantity', ii.quantity,
            'price', ii.unit_price
        ))
        FROM public.invoice_items ii
        LEFT JOIN public.products pr ON ii.product_id = pr.id
        WHERE ii.invoice_id = inv.id
    ) as products,
    inv.notes,
    inv.created_at
FROM public.invoices inv
LEFT JOIN public.contacts c ON inv.contact_id = c.id
LEFT JOIN public.profiles p ON inv.created_by = p.id
WHERE inv.is_deleted = false OR inv.is_deleted IS NULL;

-- View: Daily sales summary for trend charts
CREATE OR REPLACE VIEW public.v_sales_daily_summary AS
SELECT 
    DATE(transaction_date) as date,
    COUNT(*) as transaction_count,
    SUM(total_amount) as total_revenue,
    AVG(total_amount) as avg_transaction_value,
    COUNT(DISTINCT contact_id) as unique_customers
FROM public.v_sales_transactions
GROUP BY DATE(transaction_date)
ORDER BY date DESC;

-- View: Sales summary by agent
CREATE OR REPLACE VIEW public.v_sales_by_agent AS
SELECT 
    agent_name,
    agent_id,
    COUNT(*) as transaction_count,
    SUM(total_amount) as total_revenue,
    AVG(total_amount) as avg_transaction_value,
    COUNT(DISTINCT contact_id) as unique_customers,
    MIN(transaction_date) as first_transaction,
    MAX(transaction_date) as last_transaction
FROM public.v_sales_transactions
WHERE agent_name IS NOT NULL
GROUP BY agent_name, agent_id
ORDER BY total_revenue DESC;

-- View: Sales summary by product (flattened from JSONB)
CREATE OR REPLACE VIEW public.v_sales_by_product AS
SELECT 
    product_data->>'name' as product_name,
    SUM((product_data->>'quantity')::integer) as total_quantity,
    SUM((product_data->>'price')::numeric * (product_data->>'quantity')::integer) as total_revenue,
    COUNT(DISTINCT t.id) as transaction_count
FROM public.v_sales_transactions t,
     jsonb_array_elements(t.products) as product_data
WHERE t.products IS NOT NULL
GROUP BY product_data->>'name'
ORDER BY total_revenue DESC;

-- View: KPI metrics (current month vs previous month)
CREATE OR REPLACE VIEW public.v_sales_kpi_metrics AS
WITH current_month AS (
    SELECT 
        COUNT(*) as transaction_count,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(AVG(total_amount), 0) as avg_transaction_value,
        COUNT(DISTINCT contact_id) as unique_customers
    FROM public.v_sales_transactions
    WHERE DATE(transaction_date) >= DATE_TRUNC('month', CURRENT_DATE)
      AND DATE(transaction_date) < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
),
previous_month AS (
    SELECT 
        COUNT(*) as transaction_count,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(AVG(total_amount), 0) as avg_transaction_value,
        COUNT(DISTINCT contact_id) as unique_customers
    FROM public.v_sales_transactions
    WHERE DATE(transaction_date) >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
      AND DATE(transaction_date) < DATE_TRUNC('month', CURRENT_DATE)
)
SELECT 
    cm.transaction_count,
    cm.total_revenue,
    cm.avg_transaction_value,
    cm.unique_customers,
    pm.transaction_count as prev_transaction_count,
    pm.total_revenue as prev_total_revenue,
    pm.avg_transaction_value as prev_avg_transaction_value,
    pm.unique_customers as prev_unique_customers,
    CASE WHEN pm.total_revenue > 0 
         THEN ((cm.total_revenue - pm.total_revenue) / pm.total_revenue * 100)
         ELSE 0 END as revenue_growth_pct,
    CASE WHEN pm.transaction_count > 0 
         THEN ((cm.transaction_count - pm.transaction_count)::numeric / pm.transaction_count * 100)
         ELSE 0 END as transaction_growth_pct
FROM current_month cm, previous_month pm;

-- Grant access to authenticated users
GRANT SELECT ON public.v_sales_transactions TO authenticated;
GRANT SELECT ON public.v_sales_daily_summary TO authenticated;
GRANT SELECT ON public.v_sales_by_agent TO authenticated;
GRANT SELECT ON public.v_sales_by_product TO authenticated;
GRANT SELECT ON public.v_sales_kpi_metrics TO authenticated;
