-- Lets a cancelled order be traced back from the audit log, which is what
-- the anomaly detector (/anomalies) joins against to spot void-fraud
-- patterns — a specific order cancelled within minutes of being placed,
-- repeated by the same team member — using only data the POS already has.
alter table audit_log add column order_id uuid references orders(id) on delete set null;

create index audit_log_order_id_idx on audit_log(order_id) where order_id is not null;
