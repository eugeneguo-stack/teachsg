-- Create IP-based usage tracking table (no registration required)
CREATE TABLE ip_usage (
    id SERIAL PRIMARY KEY,
    ip_address INET NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    question_count INTEGER DEFAULT 0,
    total_cost DECIMAL(10,4) DEFAULT 0.0000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(ip_address, date)
);

-- Create index for better performance
CREATE INDEX idx_ip_usage_ip_date ON ip_usage(ip_address, date);
CREATE INDEX idx_ip_usage_date ON ip_usage(date);

-- Add update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ip_usage_updated_at
    BEFORE UPDATE ON ip_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Optional: Create view for daily cost summary
CREATE VIEW daily_cost_summary AS
SELECT
    date,
    COUNT(DISTINCT ip_address) as unique_users,
    SUM(question_count) as total_questions,
    SUM(total_cost) as total_cost,
    AVG(total_cost) as avg_cost_per_user,
    MAX(total_cost) as max_cost_per_user
FROM ip_usage
GROUP BY date
ORDER BY date DESC;