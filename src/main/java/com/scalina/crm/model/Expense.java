package com.scalina.crm.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
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
    private String title;

    @Column(name = "expense_type", nullable = false)
    private String type; // Salary, Equipment, etc.

    private String payee;

    @Column(nullable = false)
    private Double amount;

    @Column(name = "expense_date", nullable = false)
    private LocalDate expenseDate;

    @JsonProperty("isPaid")
    @Column(name = "is_paid", nullable = false)
    private boolean isPaid;

    @JsonProperty("isRecurring")
    @Column(name = "is_recurring", nullable = false)
    private boolean isRecurring;

    private String frequency; // WEEKLY, MONTHLY
    private String reference;

    // --- NEW RECEIPT STORAGE FIELDS ---
    @Column(name = "receipt_file_name")
    private String receiptFileName;

    @Column(name = "receipt_file_type")
    private String receiptFileType;

    // JsonIgnore stops the massive byte array from crashing the frontend list
    @JsonIgnore
    @Column(name = "receipt_data")
    private byte[] receiptData;
}