package com.scalina.crm.repository;

import com.scalina.crm.dto.FinancialMetrics;
import com.scalina.crm.model.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.UUID;

public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {
    List<Invoice> findByAgencyIdAndClientId(String agencyId, UUID clientId);

    @Query("SELECT " +
            "SUM(i.amount) AS totalRevenue, " +
            "SUM(i.amount - i.costOfDelivery) AS estimatedProfit " +
            "FROM Invoice i " +
            "WHERE i.agencyId = :agencyId AND i.status = 'PAID'")
    FinancialMetrics getFinancialMetricsByAgency(@Param("agencyId") String agencyId);
}