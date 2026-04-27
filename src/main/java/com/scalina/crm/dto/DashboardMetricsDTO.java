package com.scalina.crm.dto;

import lombok.Data;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Data
public class DashboardMetricsDTO {
    private long activeClients;
    private long coldWarmLeads;
    private long hotLeads;
    private BigDecimal totalRevenue;
    private BigDecimal estimatedProfit;

    public DashboardMetricsDTO(long activeClients, long coldWarmLeads, long hotLeads, BigDecimal totalRevenue, BigDecimal estimatedProfit) {
        this.activeClients = activeClients;
        this.coldWarmLeads = coldWarmLeads;
        this.hotLeads = hotLeads;
        // Default to zero if there are no paid invoices yet
        this.totalRevenue = totalRevenue != null ? totalRevenue : BigDecimal.ZERO;
        this.estimatedProfit = estimatedProfit != null ? estimatedProfit : BigDecimal.ZERO;
    }
}