package com.scalina.crm.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
@Table(name = "team_members")
public class TeamMember extends BaseEntity {
    private String name;
    private String role;
    private String firstName;
    private String lastName;
    private String dob;
    private String nationality;
    private String personalEmail;
    private String phoneNumber;
    private String residentialCountry;
    private String residentialState;
    private String streetAddress;
    private String postcode;
    private String bankCountry;
    private String bankName;
    private String accountName;
    private String bsb;
    private String accountNumber;
    private String accountPhoneNumber;
    private String emergencyContactName;
    private String emergencyContactNumber;

}
