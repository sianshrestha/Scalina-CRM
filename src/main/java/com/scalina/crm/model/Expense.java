package com.scalina.crm.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Getter
@Setter
@Table(name = "expenses")
public class Expense extends BaseEntity {

    @Column(nullable = false)
    private String title; // E.g., "Jane Doe - Base Pay" or "Adobe CC"

    @Column(name = "expense_type", nullable = false)
    private String type; // Frontend sends the category here (e.g., "Salary", "Software Subscription")

    private String payee; // The team member name or vendor

    private BigDecimal amount;

    @Column(nullable = false)
    private LocalDate expenseDate;

    private String reference;

    @Column(columnDefinition = "TEXT") // CRITICAL: Base64 image strings are huge. You must use TEXT, not VARCHAR.
    private String receiptUrl; // Matched to frontend's "receiptUrl"

    // false = Upcoming Payment, true = Make Payment clicked (moves to history)
    private boolean isPaid = false;

    // --- RECURRING LOGIC FIELDS ---
    private boolean isRecurring = false; // Matched to frontend's boolean toggle

    private String frequency; // Will store "WEEKLY" or "MONTHLY"
}