package com.scalina.crm.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Getter @Setter
@Table(name = "invoice_items")
public class InvoiceItem extends BaseEntity {

    private String description;
    private int quantity;
    private BigDecimal price;
    private BigDecimal total;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id")
    @JsonIgnore // Prevents infinite JSON loops when sending to React
    private Invoice invoice;
}
