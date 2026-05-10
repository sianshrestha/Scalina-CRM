package com.scalina.crm.repository;

import com.scalina.crm.model.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    List<Invoice> findByClientId(Long clientId);

    @Query("SELECT COALESCE(SUM(i.amount), 0) FROM Invoice i WHERE i.status = 'PAID'")
    BigDecimal getCollectedRevenue();

    @Query("SELECT COALESCE(SUM(i.amount), 0) FROM Invoice i WHERE i.status IN ('SENT', 'DUE')")
    BigDecimal getEstimatedRevenue();
}