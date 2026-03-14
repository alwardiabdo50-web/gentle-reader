INSERT INTO api_credit_costs (id, label, base_cost, sort_order)
VALUES ('search', 'Search', 1, 5)
ON CONFLICT (id) DO NOTHING;