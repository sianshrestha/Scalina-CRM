package com.scalina.crm.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DashboardMetricsDTO {
    private long activeClients;
    private long coldWarmLeads;
    private long hotLeads;

    // Split the revenues
    private BigDecimal collectedRevenue;
    private BigDecimal estimatedRevenue;

    // The final profit calculation
    private BigDecimal estimatedProfit;
}