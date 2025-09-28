-- Create global daily usage tracking table
CREATE TABLE global_usage (
    id SERIAL PRIMARY KEY,
    date DATE UNIQUE DEFAULT CURRENT_DATE,
    total_cost DECIMAL(10,4) DEFAULT 0.0000,
    question_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX idx_global_usage_date ON global_usage(date);

-- Add update trigger for updated_at
CREATE TRIGGER update_global_usage_updated_at
    BEFORE UPDATE ON global_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert today's record if it doesn't exist (optional)
INSERT INTO global_usage (date, total_cost, question_count)
VALUES (CURRENT_DATE, 0.0000, 0)
ON CONFLICT (date) DO NOTHING;

-- Create view for cost monitoring
CREATE VIEW cost_monitoring AS
SELECT
    g.date,
    g.total_cost as global_cost,
    g.question_count as global_questions,
    COUNT(DISTINCT i.ip_address) as unique_ips,
    SUM(i.question_count) as total_ip_questions,
    SUM(i.total_cost) as total_ip_costs,
    CASE
        WHEN g.total_cost >= 10.00 THEN 'LIMIT_REACHED'
        WHEN g.total_cost >= 8.00 THEN 'WARNING'
        ELSE 'NORMAL'
    END as status
FROM global_usage g
LEFT JOIN ip_usage i ON g.date = i.date
GROUP BY g.date, g.total_cost, g.question_count
ORDER BY g.date DESC;

-- Example queries for monitoring:
-- SELECT * FROM cost_monitoring WHERE date = CURRENT_DATE;
-- SELECT * FROM cost_monitoring WHERE status != 'NORMAL';
-- SELECT date, global_cost, unique_ips FROM cost_monitoring ORDER BY date DESC LIMIT 7;