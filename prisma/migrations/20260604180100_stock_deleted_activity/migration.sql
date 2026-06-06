-- Stock deletion audit event
ALTER TYPE "StockActivityType" ADD VALUE IF NOT EXISTS 'STOCK_DELETED';
