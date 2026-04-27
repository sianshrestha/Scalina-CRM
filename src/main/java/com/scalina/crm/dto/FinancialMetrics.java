package com.scalina.crm.dto;
import java.math.BigDecimal;

public interface FinancialMetrics {
    BigDecimal getTotalRevenue();
    BigDecimal getEstimatedProfit();
}
