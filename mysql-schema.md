# iFramer MySQL Database Schema

Generated: 2026-01-30

## Key Relationship Chains

### Customer Name Resolution
Customer names are NOT stored on the `sale` or `customer` tables directly. The `sale.ContactName` field is rarely populated.
The correct join chain to get a customer's name is:

```
sale.CustomerID -> customer.ID = profile.ID -> profile.PersonID -> person.ID -> person.FullName
```

For the customer's company/organisation name:
```
person.OrganisationID -> organisation.ID -> organisation.TradingName
```

Full SQL join pattern:
```sql
LEFT JOIN customer c ON c.ID = s.CustomerID
LEFT JOIN profile pr ON pr.ID = c.ID
LEFT JOIN person p ON p.ID = pr.PersonID
LEFT JOIN organisation o ON o.ID = p.OrganisationID
-- Then use: COALESCE(p.FullName, s.ContactName, '') AS Customer
-- And: COALESCE(o.TradingName, '') AS Company
```

### Job Copies
Job copies come from the `job` table directly (`job.Copies`), joined through jobline:
```
saleline.ID = jobline.ID -> jobline.JobID -> job.ID -> job.Copies
```

### Job Location
Job location/storage is stored in `job.Storage`.

### Tags
Tags are linked through junction tables (e.g., `jobtags` for jobs, `saletags` for sales):
```sql
LEFT JOIN jobtags jt ON jt.JobId = j.ID
LEFT JOIN tag t ON t.ID = jt.TagID AND t.Deleted = 0
GROUP_CONCAT(DISTINCT t.Name ORDER BY t.Name SEPARATOR ', ') AS Tags
```

## Table List (129 tables)

1. accountingintegrationsession
2. addpurchaseorderline
3. address
4. adjustedpricebreak
5. administrator
6. alert
7. allowedhosts
8. allowedtimes
9. auditentry
10. audititem
11. auditprofile
12. auditsale
13. audituser
14. backing
15. backingline
16. bankaccount
17. barcodelabel
18. barcodelabelsheet
19. breakprice
20. campaign
21. campaignlocationtags
22. campaignrecipients
23. campaigntags
24. cardpayment
25. charge
26. comboprice
27. combopricemodelcomponents
28. communicationshistory
29. contactdetails
30. country
31. coupon
32. covering
33. coveringline
34. customalert
35. customer
36. customertags
37. dedupe
38. defaultmodel
39. emailhistory
40. emailinvite
41. file
42. fillet
43. filletline
44. framer
45. frameractivesuppliers
46. framersupplier
47. help
48. history
49. image
50. importhistory
51. inheritedadjustedprice
52. inheritedbreakprice
53. inheritedframersupplier
54. inheritedmarkupprice
55. inheritedscaleprice
56. invoice
57. item
58. itempricing
59. itemtags
60. job
61. jobline
62. jobtags
63. kanbanassignedlabel
64. kanbancard
65. kanbancardlabel
66. kanbanlist
67. kpisale
68. labour
69. labourexpenses
70. labourline
71. labourscalebreak
72. layout
73. legacysaleshistory
74. legacysaleshistoryline
75. link
76. locationtag
77. logger
78. markuppricebreak
79. matboard
80. matboardline
81. messagetemplate
82. miscellaneousline
83. moulding
84. mouldingline
85. note
86. notification
87. organisation
88. payment
89. person
90. plan
91. pricebreak
92. pricemodel
93. producttypes
94. profile
95. purchaseorder
96. purchaseorderline
97. purchaseordersupplier
98. renewal
99. sale
100. saleline
101. salesalert
102. saleshistory
103. saletags
104. scale
105. scalebreak
106. smshistory
107. smspack
108. smstemplate
109. staff
110. staticbreakprice
111. staticprice
112. staticpricebreak
113. staticscaleprice
114. steppricebreak
115. supplier
116. suppliercountrytags
117. supplierdefaultvalues
118. supportpage
119. suppressionlist
120. systemitem
121. systemsupplier
122. tag
123. trader
124. tradercustomeritemtags
125. user
126. usernotification
127. xeroapisession
128. xeroglaccount
129. xerotoken

---

## Detailed Schema

### accountingintegrationsession

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| AccessKey | varchar(255) | YES | - | NULL |
| AccessSecret | varchar(255) | YES | - | NULL |
| CompanyId | varchar(45) | YES | - | NULL |
| Deleted | tinyint(1) | YES | - | NULL |
| AccountingSoftwareId | tinyint(1) | YES | - | NULL |
| ExpiryDate | datetime | YES | - | NULL |
| VerificationCode | varchar(45) | YES | - | NULL |
| FramerID | varchar(40) | YES | - | NULL |

### addpurchaseorderline

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Action | int | YES | - | NULL |
| ItemCode | varchar(255) | YES | - | NULL |
| FramerId | varchar(40) | YES | - | NULL |
| SupplierId | varchar(40) | YES | - | NULL |
| ItemName | varchar(255) | YES | - | NULL |
| ItemID | varchar(255) | YES | - | NULL |
| SalesCount | int | YES | - | NULL |
| QuantityUsed | varchar(255) | YES | - | NULL |
| QuantityToOrder | decimal(19,5) | YES | - | NULL |
| UnitName | varchar(255) | YES | - | NULL |
| ItemType | varchar(255) | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| Chops | tinyint(1) | YES | - | NULL |
| Length | int | YES | - | NULL |
| Width | int | YES | - | NULL |
| Allowance | int | YES | - | NULL |
| SaleLineId | varchar(40) | YES | - | NULL |
| ChopLength | varchar(255) | YES | - | NULL |
| ChopWidth | varchar(255) | YES | - | NULL |
| ChopHeight | varchar(255) | YES | - | NULL |
| ChopMouldingPiece | int | YES | - | NULL |
| DateModified | datetime | YES | - | NULL |
| Discontinued | bit(1) | YES | - | NULL |
| PreparedOrder | bit(1) | YES | - | NULL |
| OrderCreated | bit(1) | YES | - | NULL |

### address

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| AddressLines | varchar(255) | YES | - | NULL |
| City | varchar(255) | YES | - | NULL |
| PostCode | varchar(255) | YES | - | NULL |
| State | varchar(255) | YES | - | NULL |
| Country | varchar(255) | YES | - | NULL |
| DPID | varchar(255) | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| CountryID | varchar(40) | YES | - | NULL |

### adjustedpricebreak

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| AdjustmentAmount | decimal(19,5) | YES | - | NULL |

### administrator

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |

### alert

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | - |
| Date | date | YES | - | NULL |
| AlertText | varchar(255) | YES | - | NULL |
| Alerted | bit(1) | YES | - | NULL |
| Toaster | bit(1) | YES | - | NULL |
| Email | bit(1) | YES | - | NULL |
| Deleted | bit(1) | YES | - | NULL |
| FramerID | varchar(40) | YES | MUL | NULL |
| RecurrencePeriod | int | YES | - | NULL |
| EmailAlerted | bit(1) | YES | - | NULL |
| ToasterAlerted | bit(1) | YES | - | NULL |
| LastNotifiedDateEmail | date | YES | - | NULL |
| LastNotifiedDatePushNotifications | date | YES | - | NULL |

### allowedhosts

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| StaffID | varchar(40) | NO | MUL | NULL |
| elt | varchar(255) | YES | - | NULL |
| id | varchar(45) | YES | - | NULL |

### allowedtimes

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | YES | - | NULL |
| StaffID | varchar(40) | NO | MUL | NULL |
| elt | varchar(255) | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |

### auditentry

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| EntryTime | datetime | YES | MUL | NULL |
| IPAddress | varchar(255) | YES | - | NULL |
| CodePoint | varchar(255) | YES | - | NULL |
| Description | varchar(255) | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| FramerID | varchar(40) | YES | MUL | NULL |

### audititem

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| AuditEntryID | varchar(40) | NO | MUL | NULL |
| ItemID | varchar(40) | NO | MUL | NULL |

### auditprofile

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| AuditEntryID | varchar(40) | NO | MUL | NULL |
| ProfileID | varchar(40) | NO | MUL | NULL |

### auditsale

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| AuditEntryID | varchar(40) | NO | MUL | NULL |
| SaleID | varchar(40) | NO | MUL | NULL |

### audituser

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| AuditEntryID | varchar(40) | NO | MUL | NULL |
| UserID | varchar(40) | NO | MUL | NULL |

### backing

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| SheetWidth | decimal(19,5) | YES | - | NULL |
| SheetHeight | decimal(19,5) | YES | - | NULL |
| SheetSizeUnit | varchar(255) | YES | - | NULL |
| PackSize | int | YES | - | NULL |

### backingline

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| TotalWidth | decimal(19,5) | YES | - | NULL |
| TotalHeight | decimal(19,5) | YES | - | NULL |
| Chops | tinyint(1) | YES | - | NULL |

### bankaccount

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Bank | varchar(255) | YES | - | NULL |
| Name | varchar(255) | YES | - | NULL |
| BSB | varchar(255) | YES | - | NULL |
| Number | varchar(255) | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| DateBankNameUpdated | datetime | YES | - | NULL |
| DateAccountNameUpdated | datetime | YES | - | NULL |
| DateBSBUpdated | datetime | YES | - | NULL |
| DateAccountNumberUpdated | datetime | YES | - | NULL |

### barcodelabel

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Item | varchar(40) | YES | - | NULL |
| Copies | decimal(10,0) | YES | - | NULL |
| Codes | varchar(45) | YES | - | NULL |
| Deleted | bit(1) | YES | - | NULL |
| BarcodeLabelSheetID | varchar(40) | YES | - | NULL |

### barcodelabelsheet

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| FirstRow | int | YES | - | NULL |
| FirstColumn | int | YES | - | NULL |
| ShowPrice | bit(1) | YES | - | NULL |
| BarcodeLabelID | varchar(40) | YES | - | NULL |
| Deleted | bit(1) | YES | - | NULL |

### breakprice

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Tiered | tinyint(1) | YES | - | NULL |
| Application | int | YES | - | NULL |

### campaign

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Name | varchar(255) | YES | - | NULL |
| LastEdited | datetime | YES | - | NULL |
| DateSent | datetime | YES | MUL | NULL |
| Sent | tinyint(1) | YES | - | NULL |
| Pending | tinyint(1) | YES | - | NULL |
| Content | text | YES | - | NULL |
| Subject | varchar(255) | YES | - | NULL |
| NumberFailed | int | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| FramerID | varchar(40) | NO | MUL | NULL |
| LayoutID | varchar(40) | NO | MUL | NULL |
| FromAdmin | tinyint(1) | YES | - | NULL |
| FailedEmailAddress | text | YES | - | NULL |

### campaignlocationtags

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| CampaignId | varchar(40) | NO | MUL | NULL |
| LocationTagID | varchar(40) | NO | MUL | NULL |

### campaignrecipients

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| CampaignId | varchar(40) | NO | MUL | NULL |
| RecipientID | varchar(40) | NO | MUL | NULL |

### campaigntags

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| CampaignId | varchar(40) | NO | MUL | NULL |
| TagID | varchar(40) | NO | MUL | NULL |

### cardpayment

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Status | tinyint(1) | YES | - | NULL |
| StatusCode | varchar(255) | YES | - | NULL |
| Message | varchar(255) | YES | - | NULL |
| Reference | varchar(255) | YES | - | NULL |
| Amount | decimal(19,5) | YES | - | NULL |
| Date | datetime | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| FramerID | varchar(40) | YES | MUL | NULL |
| EwayReferenceNumber | varchar(255) | YES | - | NULL |
| TraderID | varchar(40) | YES | UNI | NULL |

### charge

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Description | varchar(255) | YES | - | NULL |
| Amount | decimal(19,5) | YES | - | NULL |
| GST | decimal(19,5) | YES | - | NULL |
| ExpiryDate | datetime | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| InvoiceID | varchar(40) | YES | MUL | NULL |

### comboprice

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| ComboPriceType | int | YES | - | NULL |

### combopricemodelcomponents

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ComboPriceModelID | varchar(40) | NO | MUL | NULL |
| ComponentPriceModelID | varchar(40) | NO | MUL | NULL |

### communicationshistory

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Message | text | YES | - | NULL |

### contactdetails

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| BusinessHoursPhoneNumber | varchar(255) | YES | MUL | NULL |
| AfterHoursPhoneNumber | varchar(255) | YES | MUL | NULL |
| MobileNumber | varchar(255) | YES | MUL | NULL |
| FaxNumber | varchar(255) | YES | MUL | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| StreetAddressID | varchar(40) | YES | MUL | NULL |
| BillingAddressID | varchar(40) | YES | MUL | NULL |
| DeliveryAddressID | varchar(40) | YES | MUL | NULL |

### country

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| CurrencyNumberFormatID | varchar(255) | YES | - | NULL |
| CountryName | varchar(255) | YES | - | NULL |
| ValueAddedTaxRegistrationNumberName | varchar(255) | YES | - | NULL |
| ValueAddedTaxRegistrationNumber | varchar(255) | YES | - | NULL |
| ValueAddedTaxName | varchar(255) | YES | - | NULL |
| ValueAddedTaxPriceModelID | varchar(40) | YES | MUL | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| SendSmsFrom | varchar(255) | YES | - | NULL |
| SmsRemovePrefix | varchar(255) | YES | - | NULL |
| SmsAddPrefix | varchar(255) | YES | - | NULL |
| SendInvoiceLink | tinyint(1) | YES | - | NULL |
| DefaultUnitBase | int | YES | - | NULL |

### coupon

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Deleted | bit(1) | YES | - | NULL |
| Name | varchar(255) | YES | - | NULL |
| DiscountType | varchar(255) | YES | - | NULL |
| DiscountAmount | decimal(10,0) | YES | - | NULL |
| PlanSlug | varchar(255) | YES | - | NULL |
| ExpiryDate | datetime | YES | - | NULL |

### covering

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| SheetWidth | decimal(19,5) | YES | - | NULL |
| SheetHeight | decimal(19,5) | YES | - | NULL |
| SheetSizeUnit | varchar(255) | YES | - | NULL |
| PackSize | int | YES | - | NULL |

### coveringline

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| TotalWidth | decimal(19,5) | YES | - | NULL |
| TotalHeight | decimal(19,5) | YES | - | NULL |
| Chops | tinyint(1) | YES | - | NULL |

### customalert

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| AlertText | varchar(255) | YES | - | NULL |
| Description | varchar(50) | YES | - | NULL |
| IsRecurring | bit(1) | YES | - | NULL |
| RecurrencePeriod | int | YES | - | NULL |

### customer

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| FramerID | varchar(40) | YES | MUL | NULL |
| ImportSource | int | YES | - | NULL |
| ImportId | varchar(255) | YES | - | NULL |
| TaxExempt | tinyint(1) | YES | - | NULL |
| TraderID | varchar(40) | YES | - | NULL |
| Unsubscribe | tinyint(1) | YES | - | 0 |
| SyncedToSendy | bit(1) | YES | - | NULL |
| Notes | text | YES | - | NULL |

### customertags

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| CustomerID | varchar(40) | NO | MUL | NULL |
| TagID | varchar(40) | NO | MUL | NULL |

### dedupe

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| id | varchar(40) | NO | - | - |
| movetoid | varchar(40) | YES | - | NULL |
| dupes | bigint | YES | - | 0 |
| code | varchar(255) | YES | - | NULL |
| supplierid | varchar(40) | YES | - | NULL |

### defaultmodel

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |

### emailhistory

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Sender | varchar(255) | YES | - | NULL |
| Recipient | varchar(255) | YES | - | NULL |

### emailinvite

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Deleted | bit(1) | YES | - | NULL |
| ExpiryDateTime | datetime | YES | - | NULL |

### file

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| ContentType | varchar(255) | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |

### fillet

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Width | decimal(19,5) | YES | - | NULL |
| WidthUnit | varchar(255) | YES | - | NULL |

### filletline

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Chops | tinyint(1) | YES | - | NULL |

### framer

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Slug | varchar(255) | YES | - | NULL |
| Name | varchar(255) | YES | - | NULL |
| TimeZoneID | varchar(255) | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| ContactDetailsID | varchar(40) | YES | MUL | NULL |
| OwnerID | varchar(40) | YES | MUL | NULL |
| CashCustomerID | varchar(40) | YES | MUL | NULL |
| NextSaleNumber | int | YES | - | NULL |
| SaleNumberPrefix | varchar(255) | YES | - | NULL |
| LogoID | varchar(40) | YES | MUL | NULL |
| BackgroundImageID | varchar(40) | YES | MUL | NULL |
| DefaultPricingID | varchar(40) | YES | MUL | NULL |
| MouldingPricingID | varchar(40) | YES | MUL | NULL |
| MatboardPricingID | varchar(40) | YES | MUL | NULL |
| CoveringPricingID | varchar(40) | YES | MUL | NULL |
| BackingPricingID | varchar(40) | YES | MUL | NULL |
| FilletPricingID | varchar(40) | YES | MUL | NULL |
| LabourPricingID | varchar(40) | YES | MUL | NULL |
| MatboardWastageCalculation | int | YES | - | NULL |
| MatboardWastagePercentage | decimal(19,5) | YES | - | NULL |
| MouldingWastageCalculation | int | YES | - | NULL |
| MouldingWastagePercentage | decimal(19,5) | YES | - | NULL |
| CoveringWastageCalculation | int | YES | - | NULL |
| CoveringWastagePercentage | decimal(19,5) | YES | - | NULL |
| BackingWastageCalculation | int | YES | - | NULL |
| BackingWastagePercentage | decimal(19,5) | YES | - | NULL |
| DefaultMouldingLength | decimal(19,5) | YES | - | NULL |
| FilletWastageCalculation | int | YES | - | NULL |
| DefaultFilletLength | decimal(19,5) | YES | - | NULL |
| FilletWastagePercentage | decimal(19,5) | YES | - | NULL |
| MouldingLabourScaleID | varchar(40) | YES | MUL | NULL |
| DefaultMouldingUnit | varchar(255) | YES | - | NULL |
| DefaultFilletUnit | varchar(255) | YES | - | NULL |
| FilletLabourScaleID | varchar(40) | YES | MUL | NULL |
| DefaultMatboardUnit | varchar(255) | YES | - | NULL |
| DefaultCoveringUnit | varchar(255) | YES | - | NULL |
| DefaultBackingUnit | varchar(255) | YES | - | NULL |
| MatboardLabourScaleID | varchar(40) | YES | MUL | NULL |
| CoveringLabourScaleID | varchar(40) | YES | MUL | NULL |
| BackingLabourScaleID | varchar(40) | YES | MUL | NULL |
| DefaultMatboardMarginUnit | varchar(255) | YES | - | NULL |
| MatboardDefaultTopMarginScaleID | varchar(40) | YES | MUL | NULL |
| MatboardDefaultBottomMarginScaleID | varchar(40) | YES | MUL | NULL |
| MatboardDefaultLeftMarginScaleID | varchar(40) | YES | MUL | NULL |
| MatboardDefaultRightMarginScaleID | varchar(40) | YES | MUL | NULL |
| DefaultMouldingRebateUnit | varchar(255) | YES | - | NULL |
| DefaultMouldingWidthUnit | varchar(255) | YES | - | NULL |
| DefaultFilletWidthUnit | varchar(255) | YES | - | NULL |
| StretchingLabourScaleID | varchar(40) | YES | MUL | NULL |
| SendSmsFrom | varchar(255) | YES | - | NULL |
| ValueAddedTaxName | varchar(255) | YES | - | NULL |
| ValueAddedTaxPriceModelID | varchar(40) | YES | MUL | NULL |
| DefaultDaysForOrderDue | int | YES | - | NULL |
| RoundJobPricing | tinyint(1) | NO | - | 0 |
| Plan | varchar(255) | YES | - | NULL |
| ValueAddedTaxRegistrationNumber | varchar(255) | YES | - | NULL |
| SendEmailFrom | varchar(255) | YES | - | NULL |
| EmailFormat | int | YES | - | NULL |
| NextPurchaseOrderNumber | int | YES | - | NULL |
| ABN | varchar(255) | YES | - | NULL |
| PaymentToken | varchar(255) | YES | - | NULL |
| Last4DigitsOfCard | varchar(255) | YES | - | NULL |
| CardExpiry | varchar(255) | YES | - | NULL |
| BillingPeriod | int | YES | - | NULL |
| PlanID | varchar(40) | YES | MUL | NULL |
| DefaultDaysForValidQuote | int | YES | - | NULL |
| LastAccessed | datetime | YES | - | NULL |
| DateRegistered | datetime | YES | - | NULL |
| MouldingRebateAllowance | decimal(19,5) | YES | - | NULL |
| ExportGLCode | varchar(255) | YES | - | NULL |
| DisplayBankDetailsOnSalesSheet | tinyint(1) | YES | - | NULL |
| BankAccountID | varchar(40) | YES | MUL | NULL |
| CalendarBarChartQuotes | tinyint(1) | YES | - | NULL |
| CalendarBarChartOrders | tinyint(1) | YES | - | NULL |
| CalendarBarChartInvoices | tinyint(1) | YES | - | NULL |
| CalendarBarChartJobsCompleted | tinyint(1) | YES | - | NULL |
| CalendarBarChartJobsCollected | tinyint(1) | YES | - | NULL |
| CalendarBarChartCuttingList | tinyint(1) | YES | - | NULL |
| CalendarDisplayQuoteAmount | tinyint(1) | YES | - | NULL |
| CalendarDisplayOrdersAmount | tinyint(1) | YES | - | NULL |
| CalendarDisplayInvoicesAmount | tinyint(1) | YES | - | NULL |
| CalendarDisplayJobsCompleted | tinyint(1) | YES | - | NULL |
| CalendarDisplayJobsCollected | tinyint(1) | YES | - | NULL |
| CalendarDisplayCuttingList | tinyint(1) | YES | - | NULL |
| CalendarDisplaySupplierOrders | tinyint(1) | YES | - | NULL |
| CalendarDisplayCashReceipts | tinyint(1) | YES | - | NULL |
| CalendarDisplayCampaigns | tinyint(1) | YES | - | NULL |
| TodayBarChartQuotes | tinyint(1) | YES | - | NULL |
| TodayBarChartOrders | tinyint(1) | YES | - | NULL |
| TodayBarChartInvoices | tinyint(1) | YES | - | NULL |
| TodayBarChartJobsCompleted | tinyint(1) | YES | - | NULL |
| TodayBarChartJobsCollected | tinyint(1) | YES | - | NULL |
| TodayBarChartCuttingList | tinyint(1) | YES | - | NULL |
| TodayDisplayQuoteAmount | tinyint(1) | YES | - | NULL |
| TodayDisplayOrdersAmount | tinyint(1) | YES | - | NULL |
| TodayDisplayInvoicesAmount | tinyint(1) | YES | - | NULL |
| TodayDisplayJobsCompleted | tinyint(1) | YES | - | NULL |
| TodayDisplayJobsCollected | tinyint(1) | YES | - | NULL |
| TodayDisplayCuttingList | tinyint(1) | YES | - | NULL |
| TodayDisplayOrdersDueToday | tinyint(1) | YES | - | NULL |
| TodayDisplayOverdueOrders | tinyint(1) | YES | - | NULL |
| TodayCashSales | tinyint(1) | YES | - | NULL |
| PeriodBarChartQuotes | tinyint(1) | YES | - | NULL |
| PeriodBarChartOrders | tinyint(1) | YES | - | NULL |
| PeriodBarChartInvoices | tinyint(1) | YES | - | NULL |
| PeriodBarChartJobsCompleted | tinyint(1) | YES | - | NULL |
| PeriodBarChartJobsCollected | tinyint(1) | YES | - | NULL |
| PeriodBarChartCuttingList | tinyint(1) | YES | - | NULL |
| PeriodDisplayQuoteAmount | tinyint(1) | YES | - | NULL |
| PeriodDisplayOrdersAmount | tinyint(1) | YES | - | NULL |
| PeriodDisplayInvoicesAmount | tinyint(1) | YES | - | NULL |
| PeriodDisplayJobsCompleted | tinyint(1) | YES | - | NULL |
| PeriodDisplayJobsCollected | tinyint(1) | YES | - | NULL |
| PeriodDisplayCuttingList | tinyint(1) | YES | - | NULL |
| PeriodCashSales | tinyint(1) | YES | - | NULL |
| PeriodSupplierOrders | tinyint(1) | YES | - | NULL |
| OverviewTotalCustomers | tinyint(1) | YES | - | NULL |
| OverviewOrdersNotCompleted | tinyint(1) | YES | - | NULL |
| OverviewOrdersOverdue | tinyint(1) | YES | - | NULL |
| OverviewOrdersInvoicesNotCollected | tinyint(1) | YES | - | NULL |
| OverviewOrdersInvoicesNotPaid | tinyint(1) | YES | - | NULL |
| OverviewSMSRemaining | tinyint(1) | YES | - | NULL |
| ValueAddedTaxRegistrationNumberName | varchar(255) | YES | - | NULL |
| BackingPresetItemID | varchar(40) | YES | MUL | NULL |
| CoveringPresetItemID | varchar(40) | YES | MUL | NULL |
| FilletPresetItemID | varchar(40) | YES | MUL | NULL |
| MiscellaneousPresetItemID | varchar(40) | YES | MUL | NULL |
| MatboardPresetItemID | varchar(40) | YES | MUL | NULL |
| MouldingPresetItemID | varchar(40) | YES | MUL | NULL |
| CountryCode | varchar(255) | YES | - | NULL |
| SmsRemovePrefix | varchar(255) | YES | - | NULL |
| SmsAddPrefix | varchar(255) | YES | - | NULL |
| PeriodBarChartLineItems | tinyint(1) | YES | - | NULL |
| PeriodDisplayLineItemsAmount | tinyint(1) | YES | - | NULL |
| SelfEmail | tinyint(1) | YES | - | NULL |
| SendInvoiceLink | tinyint(1) | YES | - | NULL |
| SyncQuotes | tinyint(1) | YES | - | NULL |
| SyncOrders | tinyint(1) | YES | - | NULL |
| SyncInvoices | tinyint(1) | YES | - | NULL |
| IFramerToXero | tinyint(1) | YES | - | NULL |
| XeroToIFramer | tinyint(1) | YES | - | NULL |
| SyncCustomersOnSales | tinyint(1) | YES | - | NULL |
| IsConnected | tinyint(1) | YES | - | NULL |
| AccessToken | varchar(255) | YES | - | NULL |
| TokenSecret | varchar(255) | YES | - | NULL |
| SelectGlCodesOnSales | tinyint(1) | YES | - | NULL |
| DefaultItemGlCode | varchar(255) | YES | - | NULL |
| DefaultJobGlCode | varchar(255) | YES | - | NULL |
| DefaultPaymentGlCode | varchar(255) | YES | - | NULL |
| DefaultDaysForInvoiceDue | int | YES | - | NULL |
| MouldingChopBasePricing | int | YES | - | NULL |
| MouldingChopDefaultAllowance | decimal(19,5) | YES | - | NULL |
| MouldingChopDefaultAllowanceUnit | varchar(255) | YES | - | NULL |
| MouldingChopPricingID | varchar(40) | YES | MUL | NULL |
| SalesRoundingOption | int | YES | - | NULL |
| roundingOption | int | YES | - | NULL |
| Rounding | int | YES | - | NULL |
| SalesRoundingGlCode | varchar(255) | YES | - | NULL |
| FooterContent | longtext | YES | - | NULL |
| ApplyToSales | tinyint(1) | YES | - | NULL |
| ApplyToStatements | tinyint(1) | YES | - | NULL |
| OnlyRoundDown | tinyint(1) | YES | - | NULL |
| DisplayBankAccountDetailsOnStatement | tinyint(1) | YES | - | NULL |
| JobsRoundingOption | int | YES | - | NULL |
| OnlyRoundDownJobs | tinyint(1) | YES | - | NULL |
| DefaultUnitBase | int | YES | - | NULL |
| CurrencyNumberFormatID | varchar(255) | YES | - | NULL |
| DefaultUnitBaseOriginal | int | YES | - | NULL |
| EmailCampaignLogoID | varchar(40) | YES | - | NULL |
| HeaderLogoID | varchar(40) | YES | - | NULL |
| ReportsLogoID | varchar(40) | YES | - | NULL |
| CurrentSubscriptionStored | varchar(255) | YES | - | NULL |
| DateCurrentSubscriptionStoredUpdate | date | YES | - | NULL |
| IsAlertShowedForToastrPopup | bit(1) | YES | - | NULL |
| IsAlertShowedForEmail | bit(1) | YES | - | NULL |
| IsAlertSendToQuotes | bit(1) | YES | - | NULL |
| IsAlertSendToOrders | bit(1) | YES | - | NULL |
| IsAlertSendToInvoices | bit(1) | YES | - | NULL |
| IsCustomAlertShowedForToastrPopup | bit(1) | YES | - | NULL |
| IsCustomAlertShowedForEmail | bit(1) | YES | - | NULL |
| IsCustomAlertShowedForNotAtAll | bit(1) | YES | - | NULL |
| FooterFontSize | int | YES | - | NULL |
| DefaultPaymentType | int | YES | - | NULL |
| BrandId | int | YES | - | NULL |
| ShowInventoryStockPurchaseOrders | bit(1) | YES | - | NULL |
| AutomaticInventory | bit(1) | YES | - | NULL |
| MinimumDefaultLength | decimal(19,5) | YES | - | NULL |
| CouponCode | varchar(255) | YES | - | NULL |
| EmailType | int | YES | - | NULL |
| EmailEndDate | date | YES | - | NULL |
| EmailStartDate | date | YES | - | NULL |
| IsEmailQuoteAlertShowed | bit(1) | YES | - | NULL |
| DisplayBankDetailsOnQuoteSalesSheet | tinyint(1) | YES | - | NULL |
| DisplayBankDetailsOnOrderSalesSheet | tinyint(1) | YES | - | NULL |
| DisplayBankDetailsOnInvoiceSalesSheet | tinyint(1) | YES | - | NULL |
| isExTax | tinyint(1) | YES | - | NULL |
| FixedInvoiceDay | int | YES | - | NULL |
| ScriptSuppliersWithUnorderedItemsDone | tinyint(1) | YES | - | NULL |
| SalePageUpdated | tinyint(1) | YES | - | NULL |
| OldPortalReadNewPolicy | tinyint(1) | YES | - | NULL |
| SaleLockSettings_LockWhenPaid | tinyint(1) | YES | - | NULL |
| SaleLockSettings_LockWhenSaleRaisedOrder | tinyint(1) | YES | - | NULL |
| SaleLockSettings_LockWhenSaleRaisedInvoice | tinyint(1) | YES | - | NULL |
| LastNotificationCustomerCount | int | YES | - | NULL |
| CustomerLimitNotificationShown | bit(1) | YES | - | NULL |
| UpdatePricingScheme | bit(1) | YES | - | NULL |
| NotRegisteredForTax | bit(1) | YES | - | NULL |
| KPISalesPeriod | int | YES | - | NULL |
| KPIWeeklyAvg | decimal(19,5) | YES | - | NULL |
| KPIMonthlyAvg | decimal(19,5) | YES | - | NULL |
| KPIQuarterlyAvg | decimal(19,5) | YES | - | NULL |
| KPISixMonthAvg | decimal(19,5) | YES | - | NULL |
| KPIYearlyAvg | decimal(19,5) | YES | - | NULL |
| UseDefaultSmsFrom | bit(1) | YES | - | b'1' |
| InitializeKanbanBoard | bit(1) | YES | - | NULL |
| InitializeSaleFullyPaidRecompute | bit(1) | YES | - | NULL |
| ForcedDisconnectedXeroTenants | bit(1) | YES | - | NULL |
| XeroConnectedTimestamp | datetime | YES | - | NULL |
| SignedUpWithXero | bit(1) | YES | - | NULL |
| XeroSignedUpId | varchar(40) | YES | - | NULL |
| SendyCustomerSubscribersInitialized | bit(1) | YES | - | NULL |

### frameractivesuppliers

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| FramerID | varchar(40) | NO | MUL | NULL |
| SupplierID | varchar(40) | NO | MUL | NULL |

### framersupplier

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| FramerID | varchar(40) | YES | MUL | NULL |
| OverrideCostUnitPriceModelID | varchar(40) | YES | MUL | NULL |
| OverrideUsedUnitPriceModelID | varchar(40) | YES | MUL | NULL |
| OverrideWastedUnitPriceModelID | varchar(40) | YES | MUL | NULL |
| UseAllProductTypes | tinyint(1) | YES | - | NULL |
| AccountNumber | varchar(255) | YES | - | NULL |

### help

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| Id | varchar(40) | NO | PRI | NULL |
| PageId | varchar(40) | YES | MUL | NULL |
| Name | varchar(50) | YES | - | NULL |
| Content | text | YES | - | NULL |
| DateCreated | date | YES | - | NULL |
| CreatedBy | int | YES | - | NULL |
| DateUpdated | date | YES | - | NULL |
| UpdatedBy | int | YES | - | NULL |
| IsActive | tinyint(1) | YES | - | NULL |
| Deleted | tinyint(1) | YES | - | NULL |

### history

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| EntryDate | datetime | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| CustomerID | varchar(40) | YES | MUL | NULL |
| ByID | varchar(40) | YES | MUL | NULL |

### image

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Width | int | YES | - | NULL |
| Height | int | YES | - | NULL |

### importhistory

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| FramerID | varchar(40) | YES | - | NULL |
| Deleted | tinyint | NO | - | NULL |
| FileName | varchar(255) | YES | - | NULL |
| FilePath | varchar(255) | YES | - | NULL |
| ImportType | int | YES | - | NULL |
| Status | int | YES | - | NULL |
| Message | varchar(255) | YES | - | NULL |
| DateTimeStamp | datetime | YES | - | NULL |
| NumCustomersImported | int | YES | - | NULL |
| NumJobsImported | int | YES | - | NULL |
| UserID | varchar(40) | YES | - | NULL |
| InitiateRestartImport | bit(1) | YES | - | NULL |

### inheritedadjustedprice

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| AdjustmentAmount | decimal(19,5) | YES | - | NULL |

### inheritedbreakprice

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |

### inheritedframersupplier

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| ParentID | varchar(40) | YES | MUL | NULL |

### inheritedmarkupprice

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| MarkupFactor | decimal(19,5) | YES | - | NULL |

### inheritedscaleprice

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |

### invoice

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Date | datetime | YES | - | NULL |
| Paid | tinyint(1) | YES | - | NULL |
| Description | varchar(255) | YES | - | NULL |
| RenewalRaised | tinyint(1) | YES | - | NULL |
| ExpiredEmailSent | tinyint(1) | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| CardPaymentID | varchar(40) | YES | MUL | NULL |
| FramerID | varchar(40) | YES | MUL | NULL |
| OperationsPaymentID | varchar(40) | YES | MUL | NULL |
| TraderID | varchar(40) | YES | MUL | NULL |

### item

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | - |
| Code | varchar(255) | YES | MUL | NULL |
| Name | varchar(255) | YES | - | NULL |
| Unit | varchar(255) | NO | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| UsedUnitPriceModelID | varchar(40) | YES | MUL | NULL |
| WastedUnitPriceModelID | varchar(40) | YES | MUL | NULL |
| CostUnitPriceModelID | varchar(40) | YES | MUL | NULL |
| ImageID | varchar(40) | YES | MUL | NULL |
| SupplierID | varchar(40) | YES | MUL | NULL |
| FramerID | varchar(40) | YES | MUL | NULL |
| ParentID | varchar(40) | YES | MUL | NULL |
| Color | varchar(255) | YES | - | NULL |
| BuyUnits | decimal(19,5) | YES | - | NULL |
| Colour | varchar(255) | YES | - | NULL |
| CustomPricingID | varchar(40) | YES | MUL | NULL |
| StorageLocation | varchar(255) | YES | - | NULL |
| VisualisationImageID | varchar(40) | YES | MUL | NULL |
| Discontinued | tinyint(1) | YES | - | NULL |
| Stock | double | YES | - | NULL |
| IndividualBuyUnit | decimal(19,5) | YES | - | NULL |
| Favourite | tinyint(1) | YES | - | NULL |
| LastModified | datetime | YES | - | NULL |
| GLCode | varchar(255) | YES | - | NULL |
| BasePriceOn | varchar(255) | YES | - | NULL |
| DefaultAllowance | decimal(19,5) | YES | - | NULL |
| DefaultAllowanceUnit | varchar(255) | NO | - | NULL |
| BasePricing | int unsigned | YES | - | NULL |
| IsFirstSave | tinyint(1) | YES | - | NULL |
| MarkupFactor | decimal(19,2) | YES | - | NULL |
| IsBackOrdered | bit(1) | YES | - | NULL |
| IsOldItem | bit(1) | YES | - | NULL |
| SizePreset | varchar(255) | YES | - | NULL |
| WasteLengths | longtext | YES | - | NULL |
| MinimumAmt | double | YES | - | NULL |
| Notes | varchar(280) | YES | - | NULL |
| TraderID | varchar(40) | YES | - | NULL |
| TraderFavourite | bit(1) | YES | - | NULL |
| OthersItemFavourite | bit(1) | YES | - | NULL |
| TraderOthersItemFavourite | bit(1) | YES | - | NULL |
| OverrideDefaultLengths | bit(1) | YES | - | NULL |
| Nickname | varchar(255) | YES | - | NULL |
| CustomCostUnitPriceModelEdited | bit(1) | YES | - | NULL |
| WastageCalculation | int | YES | - | NULL |
| WastagePercentage | decimal(19,5) | YES | - | NULL |
| FilletFavourite | bit(1) | YES | - | NULL |
| DateDeleted | datetime | YES | - | NULL |
| DateDiscontinued | datetime | YES | - | NULL |
| Profile | varchar(255) | YES | - | NULL |

### itempricing

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| UsedPriceModelID | varchar(40) | YES | MUL | NULL |
| WastedPriceModelID | varchar(40) | YES | MUL | NULL |
| CostPriceModelID | varchar(40) | YES | MUL | NULL |
| ChopPriceModelID | varchar(40) | YES | MUL | NULL |

### itemtags

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ItemID | varchar(40) | NO | MUL | NULL |
| TagID | varchar(40) | NO | MUL | NULL |

### job

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| SaleID | varchar(40) | NO | MUL | NULL |
| ArtworkUnit | varchar(255) | YES | - | NULL |
| ArtworkWidth | decimal(19,5) | YES | - | NULL |
| ArtworkHeight | decimal(19,5) | YES | - | NULL |
| Copies | int | YES | - | NULL |
| Storage | varchar(255) | YES | - | NULL |
| ArtworkId | varchar(40) | YES | MUL | NULL |
| ArtworkCondition | int | YES | - | NULL |
| Notes | text | YES | - | NULL |
| Description | varchar(255) | YES | MUL | NULL |
| Completed | tinyint(1) | YES | MUL | NULL |
| CompletedTime | datetime | YES | MUL | NULL |
| Collected | tinyint(1) | YES | - | NULL |
| CollectedTime | datetime | YES | MUL | NULL |
| RoundJobPricing | tinyint(1) | NO | - | 0 |
| JobSalesNumber | int | YES | - | NULL |
| OverridenPrice | tinyint(1) | YES | - | NULL |
| StaticTotal | decimal(19,5) | YES | - | NULL |
| CommonWidth | decimal(19,5) | YES | - | NULL |
| CommonHeight | decimal(19,5) | YES | - | NULL |
| LabourChargeEach | decimal(19,5) | YES | - | NULL |
| JobTotal | decimal(19,5) | YES | - | NULL |
| JobSubTotal | decimal(19,5) | YES | - | NULL |
| JobDiscount | decimal(19,5) | YES | - | NULL |
| JobTax | decimal(19,5) | YES | - | NULL |
| GLCode | varchar(255) | YES | - | NULL |
| SaleCuttingListCompleted | tinyint(1) | YES | - | NULL |
| ImageID | varchar(40) | YES | MUL | NULL |
| JobDiscountSet | decimal(19,5) | YES | - | NULL |
| MarkupFactor | decimal(19,5) | YES | - | NULL |
| OverrideDiscount | decimal(19,5) | YES | - | NULL |
| JobsRoundingOption | int | YES | - | NULL |
| OnlyRoundDownJobs | tinyint(1) | YES | - | NULL |
| AddToKanban | bit(1) | YES | - | NULL |
| DateAdded | datetime | YES | - | NULL |
| KanbanColumn | varchar(40) | YES | - | NULL |
| CardOrder | int | YES | - | NULL |
| SaleCuttingListCompletedDate | datetime | YES | - | NULL |
| OverrideJobPrice | tinyint(1) | YES | - | 0 |
| OverrideJobDiscountPrice | tinyint(1) | YES | - | 0 |
| TaxAmount | double | YES | - | NULL |
| OverridenPriceSalePageExTax | bit(1) | YES | - | NULL |
| PriceOverrideChangedInExTax | bit(1) | YES | - | NULL |
| TraderCompleted | bit(1) | YES | - | NULL |
| TraderCollected | bit(1) | YES | - | NULL |
| TraderCompletedTime | datetime | YES | - | NULL |
| TraderCollectedTime | datetime | YES | - | NULL |
| DiscountOverriden | bit(1) | YES | - | NULL |

### jobline

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| JobQuantity | int | YES | - | NULL |
| JobID | varchar(40) | YES | MUL | NULL |
| LineNumber | int | YES | - | NULL |

### jobtags

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| JobId | varchar(40) | NO | MUL | NULL |
| TagID | varchar(40) | NO | MUL | NULL |

### kanbanassignedlabel

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| KanbanCardID | varchar(40) | NO | MUL | NULL |
| KanbanCardLabelID | varchar(40) | NO | MUL | NULL |

### kanbancard

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| name | varchar(255) | YES | - | NULL |
| FramerID | varchar(40) | YES | - | NULL |
| KanbanColumn | varchar(40) | YES | - | NULL |
| Deleted | bit(1) | YES | - | NULL |
| CardOrder | int | YES | - | NULL |
| Description | varchar(255) | YES | - | NULL |
| JobID | varchar(40) | YES | - | NULL |
| DateAdded | datetime | YES | - | NULL |

### kanbancardlabel

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Name | varchar(255) | YES | - | NULL |
| Color | varchar(40) | YES | - | NULL |
| FramerID | varchar(40) | YES | - | NULL |
| Deleted | bit(1) | YES | - | NULL |

### kanbanlist

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Name | varchar(255) | YES | - | NULL |
| Deleted | bit(1) | YES | - | NULL |
| FramerID | varchar(40) | NO | - | NULL |
| IndexColumn | int | YES | - | NULL |

### kpisale

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| SaleID | varchar(40) | YES | - | NULL |
| FramerID | varchar(40) | YES | - | NULL |
| OrderRow | int | YES | - | NULL |
| PeriodValue | decimal(19,5) | YES | - | NULL |

### labour

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| ActualHoursFramingWeekly | decimal(10,0) | YES | - | NULL |
| NumWeeksTradingYearly | decimal(10,0) | YES | - | NULL |
| StandardLabour | tinyint(1) | YES | - | NULL |

### labourexpenses

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Name | varchar(255) | YES | - | NULL |
| Amount | decimal(12,2) | YES | - | NULL |
| LabourID | varchar(40) | YES | - | NULL |
| Deleted | bit(1) | YES | - | NULL |

### labourline

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |

### labourscalebreak

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| BreakPoint | decimal(19,5) | YES | - | NULL |
| Units | decimal(19,5) | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| ScaleBreakID | varchar(40) | YES | MUL | NULL |

### layout

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Name | varchar(255) | YES | - | NULL |
| System | tinyint(1) | YES | - | NULL |
| AssetLocation | varchar(255) | YES | - | NULL |
| HTML | text | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| ThumbnailID | varchar(40) | YES | MUL | NULL |
| FramerID | varchar(40) | NO | MUL | NULL |

### legacysaleshistory

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Description | text | YES | - | NULL |
| ImportSource | int | YES | - | NULL |
| ImportId | varchar(255) | YES | - | NULL |
| Copies | decimal(19,5) | YES | - | NULL |
| Reference | varchar(255) | YES | - | NULL |
| Total | decimal(19,5) | YES | - | NULL |
| Tax | decimal(19,5) | YES | - | NULL |
| Notes | text | YES | - | NULL |
| Discount | decimal(19,5) | YES | - | NULL |
| Paid | decimal(19,5) | YES | - | NULL |
| ArtworkWidth | decimal(19,5) | YES | - | NULL |
| ArtworkHeight | decimal(19,5) | YES | - | NULL |
| OuterWidth | decimal(19,5) | YES | - | NULL |
| OuterHeight | decimal(19,5) | YES | - | NULL |

### legacysaleshistoryline

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Code | varchar(255) | YES | - | NULL |
| Quantity | decimal(19,5) | YES | - | NULL |
| UnitPrice | decimal(19,5) | YES | - | NULL |
| Unit | varchar(255) | YES | - | NULL |
| Description | varchar(255) | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| ItemID | varchar(40) | YES | MUL | NULL |
| LegacySalesHistoryID | varchar(40) | YES | MUL | NULL |

### link

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| UrlID | int | YES | - | NULL |
| SecurityToken | int unsigned | YES | - | NULL |
| FullUrl | varchar(512) | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |

### locationtag

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Name | varchar(255) | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |

### logger

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| LogId | int | NO | PRI | NULL |
| Level | varchar(255) | YES | - | NULL |
| CallSite | varchar(255) | YES | - | NULL |
| Type | varchar(255) | YES | - | NULL |
| Message | varchar(255) | YES | - | NULL |
| LineNumber | varchar(255) | YES | - | NULL |
| AdditionalInfo | longtext | YES | - | NULL |
| StackTrace | longtext | YES | - | NULL |
| InnerException | longtext | YES | - | NULL |
| LoggedOnDate | datetime | YES | - | NULL |

### markuppricebreak

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| MarkupFactor | decimal(19,5) | YES | - | NULL |

### matboard

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| SheetWidth | decimal(19,5) | YES | - | NULL |
| SheetHeight | decimal(19,5) | YES | - | NULL |
| SheetSizeUnit | varchar(255) | YES | - | NULL |
| PackSize | int | YES | - | NULL |

### matboardline

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| LeftMargin | decimal(19,5) | NO | - | NULL |
| RightMargin | decimal(19,5) | YES | - | NULL |
| TopMargin | decimal(19,5) | YES | - | NULL |
| BottomMargin | decimal(19,5) | YES | - | NULL |
| Rebate | tinyint(1) | YES | - | NULL |
| FilletLineID | varchar(40) | YES | MUL | NULL |
| HasFillet | tinyint(1) | YES | - | NULL |
| InnerVisibleHeight | decimal(19,5) | YES | - | NULL |
| InnerVisibleWidth | decimal(19,5) | YES | - | NULL |
| OuterVisibleHeight | decimal(19,5) | YES | - | NULL |
| OuterVisibleWidth | decimal(19,5) | YES | - | NULL |
| ReverseBevel | tinyint(1) | YES | - | NULL |
| TotalWidth | decimal(19,5) | YES | - | NULL |
| TotalHeight | decimal(19,5) | YES | - | NULL |
| Chops | tinyint(1) | YES | - | NULL |

### messagetemplate

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Name | varchar(255) | YES | - | NULL |
| TemplateBody | text | YES | - | NULL |
| EmailOrSms | int | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| FramerID | varchar(40) | YES | MUL | NULL |
| TraderID | varchar(40) | YES | - | NULL |

### miscellaneousline

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| SizeToArtwork | tinyint(1) | YES | - | NULL |
| SizeToGlass | tinyint(1) | YES | - | NULL |
| SizeTo | int | YES | - | NULL |

### moulding

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Width | decimal(19,5) | YES | - | NULL |
| Recess | decimal(19,5) | YES | - | NULL |
| Rebate | decimal(19,5) | YES | - | NULL |
| WidthUnit | varchar(255) | YES | - | NULL |
| PackSize | int | YES | - | NULL |
| ChopPriceModelID | varchar(40) | YES | MUL | NULL |
| DefaultMouldingLength | decimal(19,5) | YES | - | NULL |
| Height | decimal(18,2) | YES | - | 0.00 |
| RebateHeight | decimal(18,2) | YES | - | 0.00 |

### mouldingline

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Slip | tinyint(1) | YES | - | NULL |
| FilletLineID | varchar(40) | YES | MUL | NULL |
| HasFillet | tinyint(1) | YES | - | NULL |
| StretchBar | tinyint(1) | YES | - | NULL |
| OuterFrameWidth | decimal(19,5) | YES | - | NULL |
| OuterFrameHeight | decimal(19,5) | YES | - | NULL |
| RebateAllowance | decimal(19,5) | YES | - | NULL |
| Chops | tinyint(1) | YES | - | NULL |
| ChopTopAquired | tinyint(1) | YES | - | NULL |
| ChopBottomAquired | tinyint(1) | YES | - | NULL |
| ChopLeftAquired | tinyint(1) | YES | - | NULL |
| ChopRightAquired | tinyint(1) | YES | - | NULL |
| NewRebate | decimal(19,5) | YES | - | NULL |
| TotalWidth | decimal(19,5) | YES | - | NULL |
| TotalHeight | decimal(19,5) | YES | - | NULL |

### note

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Body | varchar(255) | YES | - | NULL |

### notification

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Content | varchar(255) | YES | - | NULL |
| IncludeStaff | tinyint(1) | YES | - | NULL |
| Cancelled | tinyint(1) | YES | - | NULL |
| Date | datetime | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| Alerts | bit(1) | YES | - | NULL |
| FramerID | varchar(40) | YES | - | NULL |

### organisation

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| TradingName | varchar(255) | YES | MUL | NULL |
| Deleted | tinyint(1) | NO | - | NULL |

### payment

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| PaymentDate | datetime | YES | MUL | NULL |
| PaymentType | int | YES | - | NULL |
| Amount | decimal(19,5) | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| SaleID | varchar(40) | NO | MUL | NULL |
| GLCode | varchar(255) | YES | - | NULL |
| XeroPaymentID | varchar(255) | YES | - | NULL |
| PaidUsingScript | tinyint(1) | YES | - | NULL |
| IsFixed | bit(1) | YES | - | b'0' |
| PaidByTrader | bit(1) | YES | - | NULL |

### person

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| FirstName | varchar(255) | YES | MUL | NULL |
| LastName | varchar(255) | YES | MUL | NULL |
| EmailAddress | varchar(255) | YES | MUL | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| ContactDetailsID | varchar(40) | YES | MUL | NULL |
| OrganisationID | varchar(40) | YES | MUL | NULL |
| DateCreated | date | YES | - | NULL |
| FullName | varchar(200) | YES | MUL | NULL |

### plan

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Name | varchar(255) | YES | - | NULL |
| Slug | varchar(255) | YES | - | NULL |
| MonthlyCharge | decimal(19,5) | YES | - | NULL |
| AnnualCharge | decimal(19,5) | YES | - | NULL |
| UserLimit | int | YES | - | NULL |
| IncludedSMS | int | YES | - | NULL |
| IsTrial | tinyint(1) | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| IsTraderPlan | bit(1) | YES | - | NULL |
| NewMonthlyCharge | decimal(19,5) | YES | - | NULL |
| NewAnnualCharge | decimal(19,5) | YES | - | NULL |

### pricebreak

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| BreakPoint | decimal(19,5) | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| BreakPriceID | varchar(40) | YES | MUL | NULL |

### pricemodel

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| SavedPriceModelID | varchar(40) | YES | MUL | NULL |
| DefaultPriceModelReferenceID | varchar(40) | YES | - | NULL |

### producttypes

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| FramerSupplierID | varchar(40) | NO | MUL | NULL |
| ProductType | int | YES | - | NULL |

### profile

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| PersonID | varchar(40) | YES | MUL | NULL |
| LastActivity | datetime | YES | MUL | NULL |

### purchaseorder

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Date | datetime | YES | MUL | NULL |
| Number | varchar(255) | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| FramerID | varchar(40) | YES | MUL | NULL |
| SupplierID | varchar(40) | YES | MUL | NULL |
| IsDone | bit(1) | YES | - | NULL |

### purchaseorderline

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| UnitName | varchar(255) | YES | - | NULL |
| Quantity | decimal(19,5) | YES | - | NULL |
| ItemName | varchar(255) | YES | - | NULL |
| ItemCode | varchar(255) | YES | - | NULL |
| SalesCount | int | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| PurchaseOrderID | varchar(40) | YES | MUL | NULL |
| ItemID | varchar(40) | YES | MUL | NULL |
| ItemType | varchar(255) | YES | - | NULL |
| Chops | tinyint(1) | YES | - | NULL |
| Length | int | YES | - | NULL |
| Width | int | YES | - | NULL |
| Allowance | varchar(255) | YES | - | NULL |
| ChopLength | varchar(255) | YES | - | NULL |
| ChopWidth | varchar(255) | YES | - | NULL |
| ChopHeight | varchar(255) | YES | - | NULL |
| Status | int | YES | - | NULL |

### purchaseordersupplier

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| FramerID | varchar(40) | YES | - | NULL |
| SupplierID | varchar(40) | YES | - | NULL |
| Count | int | YES | - | NULL |
| Deleted | tinyint | NO | - | NULL |

### renewal

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| CommencementDate | datetime | YES | - | NULL |
| PlanID | varchar(40) | YES | MUL | NULL |

### sale

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| SaleType | int | YES | - | NULL |
| Number | varchar(255) | YES | MUL | NULL |
| Created | datetime | YES | MUL | NULL |
| Due | datetime | YES | - | NULL |
| DeliverBy | datetime | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| CustomerID | varchar(40) | NO | MUL | NULL |
| LastAccessedOn | datetime | YES | - | NULL |
| FramerID | varchar(40) | YES | MUL | NULL |
| Discount | decimal(19,5) | YES | - | NULL |
| Tax | decimal(19,5) | YES | - | NULL |
| Hidden | tinyint(1) | YES | - | NULL |
| Notes | mediumtext | YES | - | NULL |
| FullyPaid | tinyint(1) | YES | - | NULL |
| SaleLineTotal | decimal(19,5) | YES | - | NULL |
| SaleTotal | decimal(19,5) | YES | - | NULL |
| SaleSubTotal | decimal(19,5) | YES | - | NULL |
| SaleDiscount | decimal(19,5) | YES | - | NULL |
| SaleTax | decimal(19,5) | YES | - | NULL |
| XeroInvoiceID | varchar(255) | YES | - | NULL |
| MarkupFactor | decimal(19,5) | YES | - | NULL |
| SalesRoundingOption | int | YES | - | NULL |
| PricingVersion | int | YES | - | NULL |
| OnlyRoundDown | tinyint(1) | YES | - | NULL |
| SaleRoundingAmount | decimal(19,5) | YES | - | NULL |
| CompleteAllJobs | tinyint(1) | YES | - | NULL |
| CollectAllJobs | tinyint(1) | YES | - | NULL |
| PaidUsingScript | tinyint(1) | YES | - | NULL |
| SalesAlertActive | tinyint(1) | YES | - | NULL |
| CustomerPONum | varchar(45) | YES | - | NULL |
| UnreadTraderSale | bit(1) | YES | - | NULL |
| Unread | bit(1) | YES | - | NULL |
| TraderID | varchar(40) | YES | - | NULL |
| Locked | tinyint(1) | YES | - | NULL |
| LockedSalesRoundingOption | int | YES | - | NULL |
| LockedOnlyRoundDownSale | tinyint(1) | YES | - | NULL |
| LockedJobsRoundingOption | int | YES | - | NULL |
| LockedOnlyRoundDownJobs | tinyint(1) | YES | - | NULL |
| LockedMarkupFactor | decimal(19,5) | YES | - | NULL |
| TraderCustomerID | varchar(40) | YES | MUL | NULL |
| SubTotalJobs_Static | decimal(19,5) | YES | - | NULL |
| SubTotalTaxJobs_Static | decimal(19,5) | YES | - | NULL |
| CalculatedRounded_Static | decimal(19,5) | YES | - | NULL |
| ComputationsInitialized | bit(1) | YES | - | NULL |
| Payable_Static | decimal(19,5) | YES | - | NULL |
| XeroFixedDoublePayment | bit(1) | YES | - | NULL |
| RemoveTax | bit(1) | YES | - | NULL |
| SaleAccessed | bit(1) | YES | - | NULL |
| ContactName | text | YES | - | NULL |
| ContactPhone | text | YES | - | NULL |
| ContactEmail | text | YES | - | NULL |

### saleline

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| UsedQuantity | decimal(19,5) | NO | - | NULL |
| UsedUnitPrice | decimal(19,5) | NO | - | NULL |
| WastedQuantity | decimal(19,5) | NO | - | NULL |
| WastedUnitPrice | decimal(19,5) | NO | - | NULL |
| Adjustment | decimal(19,5) | NO | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| JobID | varchar(40) | YES | MUL | NULL |
| SaleID | varchar(40) | NO | MUL | NULL |
| ItemID | varchar(40) | NO | MUL | NULL |
| Discount | decimal(19,5) | YES | - | NULL |
| Tax | decimal(19,5) | YES | - | NULL |
| Acquired | tinyint(1) | YES | - | NULL |
| PurchaseOrderLineID | varchar(40) | YES | MUL | NULL |
| Cost | decimal(19,5) | YES | - | NULL |
| LabourHours | decimal(19,5) | YES | - | NULL |
| CreatedDate | datetime | YES | - | NULL |
| GLCode | varchar(255) | YES | - | NULL |
| SaleCuttingListCompleted | tinyint(1) | YES | - | 0 |
| Chops | tinyint(1) | YES | - | NULL |
| DiscountSet | decimal(19,5) | YES | - | NULL |
| OverrideDiscount | decimal(19,5) | YES | - | NULL |
| WastedUnitPriceMarkup | decimal(19,5) | YES | - | NULL |
| MarkupFactor | decimal(19,5) | YES | - | NULL |
| UsedUnitPriceMarkup | decimal(19,5) | YES | - | NULL |
| SaleCuttingListCompletedDate | datetime | YES | - | NULL |
| OverridePrice | tinyint(1) | YES | - | 0 |
| OverrideDiscountPrice | tinyint(1) | YES | - | 0 |
| TaxAmount | double | YES | - | NULL |
| InStock | tinyint(1) | YES | - | NULL |
| InStockDate | datetime | YES | - | NULL |

### salesalert

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| SaleID | varchar(40) | YES | MUL | NULL |
| AlertText | varchar(255) | YES | - | NULL |

### saleshistory

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| SaleID | varchar(40) | YES | MUL | NULL |
| Type | int | YES | - | NULL |

### saletags

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| SaleId | varchar(40) | NO | MUL | NULL |
| TagID | varchar(40) | NO | MUL | NULL |

### scale

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Tiered | tinyint(1) | YES | - | NULL |
| Unit | varchar(255) | NO | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| BaseMeasurment | int | YES | - | NULL |

### scalebreak

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| BreakPoint | decimal(19,5) | YES | - | NULL |
| Units | decimal(19,5) | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| ScaleBreakID | varchar(40) | YES | MUL | NULL |

### smshistory

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Sender | varchar(255) | YES | - | NULL |
| Recipient | varchar(255) | YES | - | NULL |
| SmsPackID | varchar(40) | YES | MUL | NULL |
| CalculatedMessageCount | int | YES | - | NULL |

### smspack

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Number | int | YES | - | NULL |
| Used | int | YES | - | NULL |

### smstemplate

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(255) | NO | PRI | NULL |
| Name | varchar(255) | YES | - | NULL |
| TemplateBody | text | YES | - | NULL |
| Deleted | tinyint(1) | YES | - | NULL |
| FramerID | varchar(40) | YES | MUL | NULL |

### staff

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| RestrictedByHost | tinyint(1) | YES | - | NULL |
| RestrictedByTime | tinyint(1) | YES | - | NULL |
| FramerID | varchar(40) | YES | MUL | NULL |
| Permissions | bigint | YES | - | NULL |
| Active | tinyint(1) | YES | - | NULL |
| SupplierID | varchar(40) | YES | - | NULL |
| TraderID | varchar(40) | YES | MUL | NULL |
| TraderPermissions | bigint | YES | - | NULL |
| SupplierPermission | bigint | YES | - | NULL |
| FramerPermissionsExtended | bigint | YES | - | NULL |

### staticbreakprice

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| BaseUnitPrice | decimal(19,5) | YES | - | NULL |

### staticprice

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| UnitPrice | decimal(19,5) | YES | - | NULL |
| SavedIncludingTax | tinyint(1) | YES | - | NULL |

### staticpricebreak

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| UnitPrice | decimal(19,5) | YES | - | NULL |

### staticscaleprice

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| BaseUnitPrice | decimal(19,5) | YES | - | NULL |

### steppricebreak

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| StepAmount | decimal(19,5) | YES | - | NULL |

### supplier

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Name | varchar(255) | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| Website | varchar(255) | YES | - | NULL |
| ContactDetailsID | varchar(40) | YES | MUL | NULL |
| Email | varchar(255) | YES | - | NULL |
| Archived | tinyint(1) | YES | - | NULL |
| OwnerID | varchar(40) | YES | MUL | NULL |

### suppliercountrytags

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| SupplierId | varchar(40) | YES | MUL | NULL |
| CountryTagsID | varchar(40) | YES | MUL | NULL |

### supplierdefaultvalues

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| deleted | bit(1) | YES | - | NULL |
| supplierid | varchar(40) | YES | - | NULL |
| itemtype | int | YES | - | NULL |
| columnname | varchar(255) | YES | - | NULL |
| defaultvalue | varchar(255) | YES | - | NULL |

### supportpage

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| Id | varchar(40) | NO | PRI | NULL |
| PageName | varchar(50) | YES | - | NULL |
| RoutingUrl | varchar(1000) | YES | - | NULL |
| IsActive | tinyint(1) | YES | - | NULL |
| Deleted | tinyint(1) | YES | - | NULL |

### suppressionlist

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| FramerID | varchar(40) | YES | MUL | NULL |
| elt | varchar(255) | YES | - | NULL |
| id | varchar(255) | YES | - | NULL |
| TraderID | varchar(40) | YES | - | NULL |

### systemitem

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |

### systemsupplier

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| LastUpdated | datetime | YES | - | NULL |
| Slug | varchar(255) | YES | - | NULL |

### tag

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Name | varchar(255) | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| PriceModelID | varchar(40) | YES | MUL | NULL |
| FramerID | varchar(40) | YES | MUL | NULL |

### trader

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Name | varchar(255) | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| Website | varchar(255) | YES | - | NULL |
| ContactDetailsID | varchar(40) | YES | - | NULL |
| Email | varchar(255) | YES | - | NULL |
| Archived | tinyint(1) | YES | - | NULL |
| Slug | varchar(255) | YES | - | NULL |
| OwnerID | varchar(40) | YES | - | NULL |
| CurrencyNumberFormatID | varchar(40) | YES | - | NULL |
| DefaultUnitBase | int | YES | - | NULL |
| ValueAddedTaxName | varchar(45) | YES | - | NULL |
| ValueAddedTaxPriceModelID | varchar(40) | YES | MUL | NULL |
| SmsAddPrefix | varchar(45) | YES | - | NULL |
| SmsRemovePrefix | varchar(45) | YES | - | NULL |
| SendSmsFrom | varchar(45) | YES | - | NULL |
| CustomerID | varchar(40) | YES | - | NULL |
| Disabled | bit(1) | YES | - | NULL |
| FramerID | varchar(40) | YES | MUL | NULL |
| CountryCode | varchar(45) | YES | - | NULL |
| TimeZoneId | varchar(255) | YES | - | NULL |
| MouldingPresetItemID | varchar(40) | YES | - | NULL |
| MatboardPresetItemID | varchar(40) | YES | - | NULL |
| FilletPresetItemID | varchar(40) | YES | - | NULL |
| BackingPresetItemID | varchar(40) | YES | - | NULL |
| CoveringPresetItemID | varchar(40) | YES | - | NULL |
| MiscellaneousPresetItemID | varchar(40) | YES | - | NULL |
| Last4DigitsOfCard | varchar(40) | YES | - | NULL |
| PaymentToken | varchar(255) | YES | - | NULL |
| CardExpiry | varchar(255) | YES | - | NULL |
| BackgroundImageID | varchar(40) | YES | - | NULL |
| LogoID | varchar(40) | YES | - | NULL |
| SendInvoiceLink | bit(1) | YES | - | NULL |
| EmailFormat | int | YES | - | NULL |
| SendEmailFrom | varchar(255) | YES | - | NULL |
| SelfEmail | bit(1) | YES | - | NULL |
| PlanID | varchar(40) | YES | MUL | NULL |
| BillingPeriod | int | YES | - | NULL |

### tradercustomeritemtags

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| CustomerID | varchar(40) | NO | MUL | NULL |
| TagID | varchar(40) | NO | MUL | NULL |

### user

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| PasswordHash | varchar(255) | YES | - | NULL |
| UserName | varchar(255) | YES | MUL | NULL |
| SendyEmail | varchar(255) | YES | - | NULL |
| SendyHash | varchar(255) | YES | - | NULL |
| IsOnline | bit(1) | YES | - | NULL |
| LastOnline | datetime | YES | - | NULL |

### usernotification

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| UserID | varchar(40) | NO | MUL | NULL |
| NotificationID | varchar(40) | NO | MUL | NULL |

### xeroapisession

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| AccessKey | varchar(255) | YES | - | NULL |
| AccessSecret | varchar(255) | YES | - | NULL |
| Deleted | tinyint(1) | YES | - | NULL |
| ExpiryDate | datetime | YES | - | NULL |
| VerificationCode | varchar(45) | YES | - | NULL |
| FramerID | varchar(40) | YES | - | NULL |
| TokenType | tinyint(1) | YES | - | NULL |

### xeroglaccount

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Code | varchar(255) | YES | - | NULL |
| Name | varchar(255) | YES | - | NULL |
| Payable | tinyint(1) | YES | - | NULL |
| XeroID | varchar(40) | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| FramerID | varchar(40) | NO | MUL | NULL |
| IsBankAccount | bit(1) | YES | - | NULL |

### xerotoken

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Deleted | bit(1) | NO | - | NULL |
| AccessToken | text | YES | - | NULL |
| ExpiresAt | datetime | YES | - | NULL |
| IdToken | text | YES | - | NULL |
| RefreshToken | text | YES | - | NULL |
| TenantsJson | text | YES | - | NULL |
| FramerID | varchar(40) | YES | MUL | NULL |

# iFramer MySQL Database Schema

Generated: 2026-01-30

## Key Relationship Chains

### Customer Name Resolution
Customer names are NOT stored on the `sale` or `customer` tables directly. The `sale.ContactName` field is rarely populated.
The correct join chain to get a customer's name is:

```
sale.CustomerID -> customer.ID = profile.ID -> profile.PersonID -> person.ID -> person.FullName
```

For the customer's company/organisation name:
```
person.OrganisationID -> organisation.ID -> organisation.TradingName
```

Full SQL join pattern:
```sql
LEFT JOIN customer c ON c.ID = s.CustomerID
LEFT JOIN profile pr ON pr.ID = c.ID
LEFT JOIN person p ON p.ID = pr.PersonID
LEFT JOIN organisation o ON o.ID = p.OrganisationID
-- Then use: COALESCE(p.FullName, s.ContactName, '') AS Customer
-- And: COALESCE(o.TradingName, '') AS Company
```

### Job Copies
Job copies come from the `job` table directly (`job.Copies`), joined through jobline:
```
saleline.ID = jobline.ID -> jobline.JobID -> job.ID -> job.Copies
```

### Job Location
Job location/storage is stored in `job.Storage`.

### Tags
Tags are linked through junction tables (e.g., `jobtags` for jobs, `saletags` for sales):
```sql
LEFT JOIN jobtags jt ON jt.JobId = j.ID
LEFT JOIN tag t ON t.ID = jt.TagID AND t.Deleted = 0
GROUP_CONCAT(DISTINCT t.Name ORDER BY t.Name SEPARATOR ', ') AS Tags
```

## Table List (129 tables)

1. accountingintegrationsession
2. addpurchaseorderline
3. address
4. adjustedpricebreak
5. administrator
6. alert
7. allowedhosts
8. allowedtimes
9. auditentry
10. audititem
11. auditprofile
12. auditsale
13. audituser
14. backing
15. backingline
16. bankaccount
17. barcodelabel
18. barcodelabelsheet
19. breakprice
20. campaign
21. campaignlocationtags
22. campaignrecipients
23. campaigntags
24. cardpayment
25. charge
26. comboprice
27. combopricemodelcomponents
28. communicationshistory
29. contactdetails
30. country
31. coupon
32. covering
33. coveringline
34. customalert
35. customer
36. customertags
37. dedupe
38. defaultmodel
39. emailhistory
40. emailinvite
41. file
42. fillet
43. filletline
44. framer
45. frameractivesuppliers
46. framersupplier
47. help
48. history
49. image
50. importhistory
51. inheritedadjustedprice
52. inheritedbreakprice
53. inheritedframersupplier
54. inheritedmarkupprice
55. inheritedscaleprice
56. invoice
57. item
58. itempricing
59. itemtags
60. job
61. jobline
62. jobtags
63. kanbanassignedlabel
64. kanbancard
65. kanbancardlabel
66. kanbanlist
67. kpisale
68. labour
69. labourexpenses
70. labourline
71. labourscalebreak
72. layout
73. legacysaleshistory
74. legacysaleshistoryline
75. link
76. locationtag
77. logger
78. markuppricebreak
79. matboard
80. matboardline
81. messagetemplate
82. miscellaneousline
83. moulding
84. mouldingline
85. note
86. notification
87. organisation
88. payment
89. person
90. plan
91. pricebreak
92. pricemodel
93. producttypes
94. profile
95. purchaseorder
96. purchaseorderline
97. purchaseordersupplier
98. renewal
99. sale
100. saleline
101. salesalert
102. saleshistory
103. saletags
104. scale
105. scalebreak
106. smshistory
107. smspack
108. smstemplate
109. staff
110. staticbreakprice
111. staticprice
112. staticpricebreak
113. staticscaleprice
114. steppricebreak
115. supplier
116. suppliercountrytags
117. supplierdefaultvalues
118. supportpage
119. suppressionlist
120. systemitem
121. systemsupplier
122. tag
123. trader
124. tradercustomeritemtags
125. user
126. usernotification
127. xeroapisession
128. xeroglaccount
129. xerotoken

---

## Detailed Schema

### accountingintegrationsession

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| AccessKey | varchar(255) | YES | - | NULL |
| AccessSecret | varchar(255) | YES | - | NULL |
| CompanyId | varchar(45) | YES | - | NULL |
| Deleted | tinyint(1) | YES | - | NULL |
| AccountingSoftwareId | tinyint(1) | YES | - | NULL |
| ExpiryDate | datetime | YES | - | NULL |
| VerificationCode | varchar(45) | YES | - | NULL |
| FramerID | varchar(40) | YES | - | NULL |

### addpurchaseorderline

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Action | int | YES | - | NULL |
| ItemCode | varchar(255) | YES | - | NULL |
| FramerId | varchar(40) | YES | - | NULL |
| SupplierId | varchar(40) | YES | - | NULL |
| ItemName | varchar(255) | YES | - | NULL |
| ItemID | varchar(255) | YES | - | NULL |
| SalesCount | int | YES | - | NULL |
| QuantityUsed | varchar(255) | YES | - | NULL |
| QuantityToOrder | decimal(19,5) | YES | - | NULL |
| UnitName | varchar(255) | YES | - | NULL |
| ItemType | varchar(255) | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| Chops | tinyint(1) | YES | - | NULL |
| Length | int | YES | - | NULL |
| Width | int | YES | - | NULL |
| Allowance | int | YES | - | NULL |
| SaleLineId | varchar(40) | YES | - | NULL |
| ChopLength | varchar(255) | YES | - | NULL |
| ChopWidth | varchar(255) | YES | - | NULL |
| ChopHeight | varchar(255) | YES | - | NULL |
| ChopMouldingPiece | int | YES | - | NULL |
| DateModified | datetime | YES | - | NULL |
| Discontinued | bit(1) | YES | - | NULL |
| PreparedOrder | bit(1) | YES | - | NULL |
| OrderCreated | bit(1) | YES | - | NULL |

### address

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| AddressLines | varchar(255) | YES | - | NULL |
| City | varchar(255) | YES | - | NULL |
| PostCode | varchar(255) | YES | - | NULL |
| State | varchar(255) | YES | - | NULL |
| Country | varchar(255) | YES | - | NULL |
| DPID | varchar(255) | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| CountryID | varchar(40) | YES | - | NULL |

### adjustedpricebreak

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| AdjustmentAmount | decimal(19,5) | YES | - | NULL |

### administrator

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |

### alert

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | - |
| Date | date | YES | - | NULL |
| AlertText | varchar(255) | YES | - | NULL |
| Alerted | bit(1) | YES | - | NULL |
| Toaster | bit(1) | YES | - | NULL |
| Email | bit(1) | YES | - | NULL |
| Deleted | bit(1) | YES | - | NULL |
| FramerID | varchar(40) | YES | MUL | NULL |
| RecurrencePeriod | int | YES | - | NULL |
| EmailAlerted | bit(1) | YES | - | NULL |
| ToasterAlerted | bit(1) | YES | - | NULL |
| LastNotifiedDateEmail | date | YES | - | NULL |
| LastNotifiedDatePushNotifications | date | YES | - | NULL |

### allowedhosts

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| StaffID | varchar(40) | NO | MUL | NULL |
| elt | varchar(255) | YES | - | NULL |
| id | varchar(45) | YES | - | NULL |

### allowedtimes

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | YES | - | NULL |
| StaffID | varchar(40) | NO | MUL | NULL |
| elt | varchar(255) | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |

### auditentry

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| EntryTime | datetime | YES | MUL | NULL |
| IPAddress | varchar(255) | YES | - | NULL |
| CodePoint | varchar(255) | YES | - | NULL |
| Description | varchar(255) | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| FramerID | varchar(40) | YES | MUL | NULL |

### audititem

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| AuditEntryID | varchar(40) | NO | MUL | NULL |
| ItemID | varchar(40) | NO | MUL | NULL |

### auditprofile

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| AuditEntryID | varchar(40) | NO | MUL | NULL |
| ProfileID | varchar(40) | NO | MUL | NULL |

### auditsale

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| AuditEntryID | varchar(40) | NO | MUL | NULL |
| SaleID | varchar(40) | NO | MUL | NULL |

### audituser

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| AuditEntryID | varchar(40) | NO | MUL | NULL |
| UserID | varchar(40) | NO | MUL | NULL |

### backing

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| SheetWidth | decimal(19,5) | YES | - | NULL |
| SheetHeight | decimal(19,5) | YES | - | NULL |
| SheetSizeUnit | varchar(255) | YES | - | NULL |
| PackSize | int | YES | - | NULL |

### backingline

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| TotalWidth | decimal(19,5) | YES | - | NULL |
| TotalHeight | decimal(19,5) | YES | - | NULL |
| Chops | tinyint(1) | YES | - | NULL |

### bankaccount

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Bank | varchar(255) | YES | - | NULL |
| Name | varchar(255) | YES | - | NULL |
| BSB | varchar(255) | YES | - | NULL |
| Number | varchar(255) | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| DateBankNameUpdated | datetime | YES | - | NULL |
| DateAccountNameUpdated | datetime | YES | - | NULL |
| DateBSBUpdated | datetime | YES | - | NULL |
| DateAccountNumberUpdated | datetime | YES | - | NULL |

### barcodelabel

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Item | varchar(40) | YES | - | NULL |
| Copies | decimal(10,0) | YES | - | NULL |
| Codes | varchar(45) | YES | - | NULL |
| Deleted | bit(1) | YES | - | NULL |
| BarcodeLabelSheetID | varchar(40) | YES | - | NULL |

### barcodelabelsheet

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| FirstRow | int | YES | - | NULL |
| FirstColumn | int | YES | - | NULL |
| ShowPrice | bit(1) | YES | - | NULL |
| BarcodeLabelID | varchar(40) | YES | - | NULL |
| Deleted | bit(1) | YES | - | NULL |

### breakprice

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Tiered | tinyint(1) | YES | - | NULL |
| Application | int | YES | - | NULL |

### campaign

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Name | varchar(255) | YES | - | NULL |
| LastEdited | datetime | YES | - | NULL |
| DateSent | datetime | YES | MUL | NULL |
| Sent | tinyint(1) | YES | - | NULL |
| Pending | tinyint(1) | YES | - | NULL |
| Content | text | YES | - | NULL |
| Subject | varchar(255) | YES | - | NULL |
| NumberFailed | int | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| FramerID | varchar(40) | NO | MUL | NULL |
| LayoutID | varchar(40) | NO | MUL | NULL |
| FromAdmin | tinyint(1) | YES | - | NULL |
| FailedEmailAddress | text | YES | - | NULL |

### campaignlocationtags

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| CampaignId | varchar(40) | NO | MUL | NULL |
| LocationTagID | varchar(40) | NO | MUL | NULL |

### campaignrecipients

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| CampaignId | varchar(40) | NO | MUL | NULL |
| RecipientID | varchar(40) | NO | MUL | NULL |

### campaigntags

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| CampaignId | varchar(40) | NO | MUL | NULL |
| TagID | varchar(40) | NO | MUL | NULL |

### cardpayment

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Status | tinyint(1) | YES | - | NULL |
| StatusCode | varchar(255) | YES | - | NULL |
| Message | varchar(255) | YES | - | NULL |
| Reference | varchar(255) | YES | - | NULL |
| Amount | decimal(19,5) | YES | - | NULL |
| Date | datetime | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| FramerID | varchar(40) | YES | MUL | NULL |
| EwayReferenceNumber | varchar(255) | YES | - | NULL |
| TraderID | varchar(40) | YES | UNI | NULL |

### charge

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Description | varchar(255) | YES | - | NULL |
| Amount | decimal(19,5) | YES | - | NULL |
| GST | decimal(19,5) | YES | - | NULL |
| ExpiryDate | datetime | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| InvoiceID | varchar(40) | YES | MUL | NULL |

### comboprice

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| ComboPriceType | int | YES | - | NULL |

### combopricemodelcomponents

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ComboPriceModelID | varchar(40) | NO | MUL | NULL |
| ComponentPriceModelID | varchar(40) | NO | MUL | NULL |

### communicationshistory

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Message | text | YES | - | NULL |

### contactdetails

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| BusinessHoursPhoneNumber | varchar(255) | YES | MUL | NULL |
| AfterHoursPhoneNumber | varchar(255) | YES | MUL | NULL |
| MobileNumber | varchar(255) | YES | MUL | NULL |
| FaxNumber | varchar(255) | YES | MUL | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| StreetAddressID | varchar(40) | YES | MUL | NULL |
| BillingAddressID | varchar(40) | YES | MUL | NULL |
| DeliveryAddressID | varchar(40) | YES | MUL | NULL |

### country

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| CurrencyNumberFormatID | varchar(255) | YES | - | NULL |
| CountryName | varchar(255) | YES | - | NULL |
| ValueAddedTaxRegistrationNumberName | varchar(255) | YES | - | NULL |
| ValueAddedTaxRegistrationNumber | varchar(255) | YES | - | NULL |
| ValueAddedTaxName | varchar(255) | YES | - | NULL |
| ValueAddedTaxPriceModelID | varchar(40) | YES | MUL | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| SendSmsFrom | varchar(255) | YES | - | NULL |
| SmsRemovePrefix | varchar(255) | YES | - | NULL |
| SmsAddPrefix | varchar(255) | YES | - | NULL |
| SendInvoiceLink | tinyint(1) | YES | - | NULL |
| DefaultUnitBase | int | YES | - | NULL |

### coupon

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Deleted | bit(1) | YES | - | NULL |
| Name | varchar(255) | YES | - | NULL |
| DiscountType | varchar(255) | YES | - | NULL |
| DiscountAmount | decimal(10,0) | YES | - | NULL |
| PlanSlug | varchar(255) | YES | - | NULL |
| ExpiryDate | datetime | YES | - | NULL |

### covering

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| SheetWidth | decimal(19,5) | YES | - | NULL |
| SheetHeight | decimal(19,5) | YES | - | NULL |
| SheetSizeUnit | varchar(255) | YES | - | NULL |
| PackSize | int | YES | - | NULL |

### coveringline

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| TotalWidth | decimal(19,5) | YES | - | NULL |
| TotalHeight | decimal(19,5) | YES | - | NULL |
| Chops | tinyint(1) | YES | - | NULL |

### customalert

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| AlertText | varchar(255) | YES | - | NULL |
| Description | varchar(50) | YES | - | NULL |
| IsRecurring | bit(1) | YES | - | NULL |
| RecurrencePeriod | int | YES | - | NULL |

### customer

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| FramerID | varchar(40) | YES | MUL | NULL |
| ImportSource | int | YES | - | NULL |
| ImportId | varchar(255) | YES | - | NULL |
| TaxExempt | tinyint(1) | YES | - | NULL |
| TraderID | varchar(40) | YES | - | NULL |
| Unsubscribe | tinyint(1) | YES | - | 0 |
| SyncedToSendy | bit(1) | YES | - | NULL |
| Notes | text | YES | - | NULL |

### customertags

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| CustomerID | varchar(40) | NO | MUL | NULL |
| TagID | varchar(40) | NO | MUL | NULL |

### dedupe

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| id | varchar(40) | NO | - | - |
| movetoid | varchar(40) | YES | - | NULL |
| dupes | bigint | YES | - | 0 |
| code | varchar(255) | YES | - | NULL |
| supplierid | varchar(40) | YES | - | NULL |

### defaultmodel

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |

### emailhistory

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Sender | varchar(255) | YES | - | NULL |
| Recipient | varchar(255) | YES | - | NULL |

### emailinvite

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Deleted | bit(1) | YES | - | NULL |
| ExpiryDateTime | datetime | YES | - | NULL |

### file

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| ContentType | varchar(255) | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |

### fillet

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Width | decimal(19,5) | YES | - | NULL |
| WidthUnit | varchar(255) | YES | - | NULL |

### filletline

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Chops | tinyint(1) | YES | - | NULL |

### framer

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Slug | varchar(255) | YES | - | NULL |
| Name | varchar(255) | YES | - | NULL |
| TimeZoneID | varchar(255) | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| ContactDetailsID | varchar(40) | YES | MUL | NULL |
| OwnerID | varchar(40) | YES | MUL | NULL |
| CashCustomerID | varchar(40) | YES | MUL | NULL |
| NextSaleNumber | int | YES | - | NULL |
| SaleNumberPrefix | varchar(255) | YES | - | NULL |
| LogoID | varchar(40) | YES | MUL | NULL |
| BackgroundImageID | varchar(40) | YES | MUL | NULL |
| DefaultPricingID | varchar(40) | YES | MUL | NULL |
| MouldingPricingID | varchar(40) | YES | MUL | NULL |
| MatboardPricingID | varchar(40) | YES | MUL | NULL |
| CoveringPricingID | varchar(40) | YES | MUL | NULL |
| BackingPricingID | varchar(40) | YES | MUL | NULL |
| FilletPricingID | varchar(40) | YES | MUL | NULL |
| LabourPricingID | varchar(40) | YES | MUL | NULL |
| MatboardWastageCalculation | int | YES | - | NULL |
| MatboardWastagePercentage | decimal(19,5) | YES | - | NULL |
| MouldingWastageCalculation | int | YES | - | NULL |
| MouldingWastagePercentage | decimal(19,5) | YES | - | NULL |
| CoveringWastageCalculation | int | YES | - | NULL |
| CoveringWastagePercentage | decimal(19,5) | YES | - | NULL |
| BackingWastageCalculation | int | YES | - | NULL |
| BackingWastagePercentage | decimal(19,5) | YES | - | NULL |
| DefaultMouldingLength | decimal(19,5) | YES | - | NULL |
| FilletWastageCalculation | int | YES | - | NULL |
| DefaultFilletLength | decimal(19,5) | YES | - | NULL |
| FilletWastagePercentage | decimal(19,5) | YES | - | NULL |
| MouldingLabourScaleID | varchar(40) | YES | MUL | NULL |
| DefaultMouldingUnit | varchar(255) | YES | - | NULL |
| DefaultFilletUnit | varchar(255) | YES | - | NULL |
| FilletLabourScaleID | varchar(40) | YES | MUL | NULL |
| DefaultMatboardUnit | varchar(255) | YES | - | NULL |
| DefaultCoveringUnit | varchar(255) | YES | - | NULL |
| DefaultBackingUnit | varchar(255) | YES | - | NULL |
| MatboardLabourScaleID | varchar(40) | YES | MUL | NULL |
| CoveringLabourScaleID | varchar(40) | YES | MUL | NULL |
| BackingLabourScaleID | varchar(40) | YES | MUL | NULL |
| DefaultMatboardMarginUnit | varchar(255) | YES | - | NULL |
| MatboardDefaultTopMarginScaleID | varchar(40) | YES | MUL | NULL |
| MatboardDefaultBottomMarginScaleID | varchar(40) | YES | MUL | NULL |
| MatboardDefaultLeftMarginScaleID | varchar(40) | YES | MUL | NULL |
| MatboardDefaultRightMarginScaleID | varchar(40) | YES | MUL | NULL |
| DefaultMouldingRebateUnit | varchar(255) | YES | - | NULL |
| DefaultMouldingWidthUnit | varchar(255) | YES | - | NULL |
| DefaultFilletWidthUnit | varchar(255) | YES | - | NULL |
| StretchingLabourScaleID | varchar(40) | YES | MUL | NULL |
| SendSmsFrom | varchar(255) | YES | - | NULL |
| ValueAddedTaxName | varchar(255) | YES | - | NULL |
| ValueAddedTaxPriceModelID | varchar(40) | YES | MUL | NULL |
| DefaultDaysForOrderDue | int | YES | - | NULL |
| RoundJobPricing | tinyint(1) | NO | - | 0 |
| Plan | varchar(255) | YES | - | NULL |
| ValueAddedTaxRegistrationNumber | varchar(255) | YES | - | NULL |
| SendEmailFrom | varchar(255) | YES | - | NULL |
| EmailFormat | int | YES | - | NULL |
| NextPurchaseOrderNumber | int | YES | - | NULL |
| ABN | varchar(255) | YES | - | NULL |
| PaymentToken | varchar(255) | YES | - | NULL |
| Last4DigitsOfCard | varchar(255) | YES | - | NULL |
| CardExpiry | varchar(255) | YES | - | NULL |
| BillingPeriod | int | YES | - | NULL |
| PlanID | varchar(40) | YES | MUL | NULL |
| DefaultDaysForValidQuote | int | YES | - | NULL |
| LastAccessed | datetime | YES | - | NULL |
| DateRegistered | datetime | YES | - | NULL |
| MouldingRebateAllowance | decimal(19,5) | YES | - | NULL |
| ExportGLCode | varchar(255) | YES | - | NULL |
| DisplayBankDetailsOnSalesSheet | tinyint(1) | YES | - | NULL |
| BankAccountID | varchar(40) | YES | MUL | NULL |
| CalendarBarChartQuotes | tinyint(1) | YES | - | NULL |
| CalendarBarChartOrders | tinyint(1) | YES | - | NULL |
| CalendarBarChartInvoices | tinyint(1) | YES | - | NULL |
| CalendarBarChartJobsCompleted | tinyint(1) | YES | - | NULL |
| CalendarBarChartJobsCollected | tinyint(1) | YES | - | NULL |
| CalendarBarChartCuttingList | tinyint(1) | YES | - | NULL |
| CalendarDisplayQuoteAmount | tinyint(1) | YES | - | NULL |
| CalendarDisplayOrdersAmount | tinyint(1) | YES | - | NULL |
| CalendarDisplayInvoicesAmount | tinyint(1) | YES | - | NULL |
| CalendarDisplayJobsCompleted | tinyint(1) | YES | - | NULL |
| CalendarDisplayJobsCollected | tinyint(1) | YES | - | NULL |
| CalendarDisplayCuttingList | tinyint(1) | YES | - | NULL |
| CalendarDisplaySupplierOrders | tinyint(1) | YES | - | NULL |
| CalendarDisplayCashReceipts | tinyint(1) | YES | - | NULL |
| CalendarDisplayCampaigns | tinyint(1) | YES | - | NULL |
| TodayBarChartQuotes | tinyint(1) | YES | - | NULL |
| TodayBarChartOrders | tinyint(1) | YES | - | NULL |
| TodayBarChartInvoices | tinyint(1) | YES | - | NULL |
| TodayBarChartJobsCompleted | tinyint(1) | YES | - | NULL |
| TodayBarChartJobsCollected | tinyint(1) | YES | - | NULL |
| TodayBarChartCuttingList | tinyint(1) | YES | - | NULL |
| TodayDisplayQuoteAmount | tinyint(1) | YES | - | NULL |
| TodayDisplayOrdersAmount | tinyint(1) | YES | - | NULL |
| TodayDisplayInvoicesAmount | tinyint(1) | YES | - | NULL |
| TodayDisplayJobsCompleted | tinyint(1) | YES | - | NULL |
| TodayDisplayJobsCollected | tinyint(1) | YES | - | NULL |
| TodayDisplayCuttingList | tinyint(1) | YES | - | NULL |
| TodayDisplayOrdersDueToday | tinyint(1) | YES | - | NULL |
| TodayDisplayOverdueOrders | tinyint(1) | YES | - | NULL |
| TodayCashSales | tinyint(1) | YES | - | NULL |
| PeriodBarChartQuotes | tinyint(1) | YES | - | NULL |
| PeriodBarChartOrders | tinyint(1) | YES | - | NULL |
| PeriodBarChartInvoices | tinyint(1) | YES | - | NULL |
| PeriodBarChartJobsCompleted | tinyint(1) | YES | - | NULL |
| PeriodBarChartJobsCollected | tinyint(1) | YES | - | NULL |
| PeriodBarChartCuttingList | tinyint(1) | YES | - | NULL |
| PeriodDisplayQuoteAmount | tinyint(1) | YES | - | NULL |
| PeriodDisplayOrdersAmount | tinyint(1) | YES | - | NULL |
| PeriodDisplayInvoicesAmount | tinyint(1) | YES | - | NULL |
| PeriodDisplayJobsCompleted | tinyint(1) | YES | - | NULL |
| PeriodDisplayJobsCollected | tinyint(1) | YES | - | NULL |
| PeriodDisplayCuttingList | tinyint(1) | YES | - | NULL |
| PeriodCashSales | tinyint(1) | YES | - | NULL |
| PeriodSupplierOrders | tinyint(1) | YES | - | NULL |
| OverviewTotalCustomers | tinyint(1) | YES | - | NULL |
| OverviewOrdersNotCompleted | tinyint(1) | YES | - | NULL |
| OverviewOrdersOverdue | tinyint(1) | YES | - | NULL |
| OverviewOrdersInvoicesNotCollected | tinyint(1) | YES | - | NULL |
| OverviewOrdersInvoicesNotPaid | tinyint(1) | YES | - | NULL |
| OverviewSMSRemaining | tinyint(1) | YES | - | NULL |
| ValueAddedTaxRegistrationNumberName | varchar(255) | YES | - | NULL |
| BackingPresetItemID | varchar(40) | YES | MUL | NULL |
| CoveringPresetItemID | varchar(40) | YES | MUL | NULL |
| FilletPresetItemID | varchar(40) | YES | MUL | NULL |
| MiscellaneousPresetItemID | varchar(40) | YES | MUL | NULL |
| MatboardPresetItemID | varchar(40) | YES | MUL | NULL |
| MouldingPresetItemID | varchar(40) | YES | MUL | NULL |
| CountryCode | varchar(255) | YES | - | NULL |
| SmsRemovePrefix | varchar(255) | YES | - | NULL |
| SmsAddPrefix | varchar(255) | YES | - | NULL |
| PeriodBarChartLineItems | tinyint(1) | YES | - | NULL |
| PeriodDisplayLineItemsAmount | tinyint(1) | YES | - | NULL |
| SelfEmail | tinyint(1) | YES | - | NULL |
| SendInvoiceLink | tinyint(1) | YES | - | NULL |
| SyncQuotes | tinyint(1) | YES | - | NULL |
| SyncOrders | tinyint(1) | YES | - | NULL |
| SyncInvoices | tinyint(1) | YES | - | NULL |
| IFramerToXero | tinyint(1) | YES | - | NULL |
| XeroToIFramer | tinyint(1) | YES | - | NULL |
| SyncCustomersOnSales | tinyint(1) | YES | - | NULL |
| IsConnected | tinyint(1) | YES | - | NULL |
| AccessToken | varchar(255) | YES | - | NULL |
| TokenSecret | varchar(255) | YES | - | NULL |
| SelectGlCodesOnSales | tinyint(1) | YES | - | NULL |
| DefaultItemGlCode | varchar(255) | YES | - | NULL |
| DefaultJobGlCode | varchar(255) | YES | - | NULL |
| DefaultPaymentGlCode | varchar(255) | YES | - | NULL |
| DefaultDaysForInvoiceDue | int | YES | - | NULL |
| MouldingChopBasePricing | int | YES | - | NULL |
| MouldingChopDefaultAllowance | decimal(19,5) | YES | - | NULL |
| MouldingChopDefaultAllowanceUnit | varchar(255) | YES | - | NULL |
| MouldingChopPricingID | varchar(40) | YES | MUL | NULL |
| SalesRoundingOption | int | YES | - | NULL |
| roundingOption | int | YES | - | NULL |
| Rounding | int | YES | - | NULL |
| SalesRoundingGlCode | varchar(255) | YES | - | NULL |
| FooterContent | longtext | YES | - | NULL |
| ApplyToSales | tinyint(1) | YES | - | NULL |
| ApplyToStatements | tinyint(1) | YES | - | NULL |
| OnlyRoundDown | tinyint(1) | YES | - | NULL |
| DisplayBankAccountDetailsOnStatement | tinyint(1) | YES | - | NULL |
| JobsRoundingOption | int | YES | - | NULL |
| OnlyRoundDownJobs | tinyint(1) | YES | - | NULL |
| DefaultUnitBase | int | YES | - | NULL |
| CurrencyNumberFormatID | varchar(255) | YES | - | NULL |
| DefaultUnitBaseOriginal | int | YES | - | NULL |
| EmailCampaignLogoID | varchar(40) | YES | - | NULL |
| HeaderLogoID | varchar(40) | YES | - | NULL |
| ReportsLogoID | varchar(40) | YES | - | NULL |
| CurrentSubscriptionStored | varchar(255) | YES | - | NULL |
| DateCurrentSubscriptionStoredUpdate | date | YES | - | NULL |
| IsAlertShowedForToastrPopup | bit(1) | YES | - | NULL |
| IsAlertShowedForEmail | bit(1) | YES | - | NULL |
| IsAlertSendToQuotes | bit(1) | YES | - | NULL |
| IsAlertSendToOrders | bit(1) | YES | - | NULL |
| IsAlertSendToInvoices | bit(1) | YES | - | NULL |
| IsCustomAlertShowedForToastrPopup | bit(1) | YES | - | NULL |
| IsCustomAlertShowedForEmail | bit(1) | YES | - | NULL |
| IsCustomAlertShowedForNotAtAll | bit(1) | YES | - | NULL |
| FooterFontSize | int | YES | - | NULL |
| DefaultPaymentType | int | YES | - | NULL |
| BrandId | int | YES | - | NULL |
| ShowInventoryStockPurchaseOrders | bit(1) | YES | - | NULL |
| AutomaticInventory | bit(1) | YES | - | NULL |
| MinimumDefaultLength | decimal(19,5) | YES | - | NULL |
| CouponCode | varchar(255) | YES | - | NULL |
| EmailType | int | YES | - | NULL |
| EmailEndDate | date | YES | - | NULL |
| EmailStartDate | date | YES | - | NULL |
| IsEmailQuoteAlertShowed | bit(1) | YES | - | NULL |
| DisplayBankDetailsOnQuoteSalesSheet | tinyint(1) | YES | - | NULL |
| DisplayBankDetailsOnOrderSalesSheet | tinyint(1) | YES | - | NULL |
| DisplayBankDetailsOnInvoiceSalesSheet | tinyint(1) | YES | - | NULL |
| isExTax | tinyint(1) | YES | - | NULL |
| FixedInvoiceDay | int | YES | - | NULL |
| ScriptSuppliersWithUnorderedItemsDone | tinyint(1) | YES | - | NULL |
| SalePageUpdated | tinyint(1) | YES | - | NULL |
| OldPortalReadNewPolicy | tinyint(1) | YES | - | NULL |
| SaleLockSettings_LockWhenPaid | tinyint(1) | YES | - | NULL |
| SaleLockSettings_LockWhenSaleRaisedOrder | tinyint(1) | YES | - | NULL |
| SaleLockSettings_LockWhenSaleRaisedInvoice | tinyint(1) | YES | - | NULL |
| LastNotificationCustomerCount | int | YES | - | NULL |
| CustomerLimitNotificationShown | bit(1) | YES | - | NULL |
| UpdatePricingScheme | bit(1) | YES | - | NULL |
| NotRegisteredForTax | bit(1) | YES | - | NULL |
| KPISalesPeriod | int | YES | - | NULL |
| KPIWeeklyAvg | decimal(19,5) | YES | - | NULL |
| KPIMonthlyAvg | decimal(19,5) | YES | - | NULL |
| KPIQuarterlyAvg | decimal(19,5) | YES | - | NULL |
| KPISixMonthAvg | decimal(19,5) | YES | - | NULL |
| KPIYearlyAvg | decimal(19,5) | YES | - | NULL |
| UseDefaultSmsFrom | bit(1) | YES | - | b'1' |
| InitializeKanbanBoard | bit(1) | YES | - | NULL |
| InitializeSaleFullyPaidRecompute | bit(1) | YES | - | NULL |
| ForcedDisconnectedXeroTenants | bit(1) | YES | - | NULL |
| XeroConnectedTimestamp | datetime | YES | - | NULL |
| SignedUpWithXero | bit(1) | YES | - | NULL |
| XeroSignedUpId | varchar(40) | YES | - | NULL |
| SendyCustomerSubscribersInitialized | bit(1) | YES | - | NULL |

### frameractivesuppliers

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| FramerID | varchar(40) | NO | MUL | NULL |
| SupplierID | varchar(40) | NO | MUL | NULL |

### framersupplier

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| FramerID | varchar(40) | YES | MUL | NULL |
| OverrideCostUnitPriceModelID | varchar(40) | YES | MUL | NULL |
| OverrideUsedUnitPriceModelID | varchar(40) | YES | MUL | NULL |
| OverrideWastedUnitPriceModelID | varchar(40) | YES | MUL | NULL |
| UseAllProductTypes | tinyint(1) | YES | - | NULL |
| AccountNumber | varchar(255) | YES | - | NULL |

### help

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| Id | varchar(40) | NO | PRI | NULL |
| PageId | varchar(40) | YES | MUL | NULL |
| Name | varchar(50) | YES | - | NULL |
| Content | text | YES | - | NULL |
| DateCreated | date | YES | - | NULL |
| CreatedBy | int | YES | - | NULL |
| DateUpdated | date | YES | - | NULL |
| UpdatedBy | int | YES | - | NULL |
| IsActive | tinyint(1) | YES | - | NULL |
| Deleted | tinyint(1) | YES | - | NULL |

### history

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| EntryDate | datetime | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| CustomerID | varchar(40) | YES | MUL | NULL |
| ByID | varchar(40) | YES | MUL | NULL |

### image

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Width | int | YES | - | NULL |
| Height | int | YES | - | NULL |

### importhistory

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| FramerID | varchar(40) | YES | - | NULL |
| Deleted | tinyint | NO | - | NULL |
| FileName | varchar(255) | YES | - | NULL |
| FilePath | varchar(255) | YES | - | NULL |
| ImportType | int | YES | - | NULL |
| Status | int | YES | - | NULL |
| Message | varchar(255) | YES | - | NULL |
| DateTimeStamp | datetime | YES | - | NULL |
| NumCustomersImported | int | YES | - | NULL |
| NumJobsImported | int | YES | - | NULL |
| UserID | varchar(40) | YES | - | NULL |
| InitiateRestartImport | bit(1) | YES | - | NULL |

### inheritedadjustedprice

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| AdjustmentAmount | decimal(19,5) | YES | - | NULL |

### inheritedbreakprice

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |

### inheritedframersupplier

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| ParentID | varchar(40) | YES | MUL | NULL |

### inheritedmarkupprice

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| MarkupFactor | decimal(19,5) | YES | - | NULL |

### inheritedscaleprice

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |

### invoice

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Date | datetime | YES | - | NULL |
| Paid | tinyint(1) | YES | - | NULL |
| Description | varchar(255) | YES | - | NULL |
| RenewalRaised | tinyint(1) | YES | - | NULL |
| ExpiredEmailSent | tinyint(1) | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| CardPaymentID | varchar(40) | YES | MUL | NULL |
| FramerID | varchar(40) | YES | MUL | NULL |
| OperationsPaymentID | varchar(40) | YES | MUL | NULL |
| TraderID | varchar(40) | YES | MUL | NULL |

### item

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | - |
| Code | varchar(255) | YES | MUL | NULL |
| Name | varchar(255) | YES | - | NULL |
| Unit | varchar(255) | NO | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| UsedUnitPriceModelID | varchar(40) | YES | MUL | NULL |
| WastedUnitPriceModelID | varchar(40) | YES | MUL | NULL |
| CostUnitPriceModelID | varchar(40) | YES | MUL | NULL |
| ImageID | varchar(40) | YES | MUL | NULL |
| SupplierID | varchar(40) | YES | MUL | NULL |
| FramerID | varchar(40) | YES | MUL | NULL |
| ParentID | varchar(40) | YES | MUL | NULL |
| Color | varchar(255) | YES | - | NULL |
| BuyUnits | decimal(19,5) | YES | - | NULL |
| Colour | varchar(255) | YES | - | NULL |
| CustomPricingID | varchar(40) | YES | MUL | NULL |
| StorageLocation | varchar(255) | YES | - | NULL |
| VisualisationImageID | varchar(40) | YES | MUL | NULL |
| Discontinued | tinyint(1) | YES | - | NULL |
| Stock | double | YES | - | NULL |
| IndividualBuyUnit | decimal(19,5) | YES | - | NULL |
| Favourite | tinyint(1) | YES | - | NULL |
| LastModified | datetime | YES | - | NULL |
| GLCode | varchar(255) | YES | - | NULL |
| BasePriceOn | varchar(255) | YES | - | NULL |
| DefaultAllowance | decimal(19,5) | YES | - | NULL |
| DefaultAllowanceUnit | varchar(255) | NO | - | NULL |
| BasePricing | int unsigned | YES | - | NULL |
| IsFirstSave | tinyint(1) | YES | - | NULL |
| MarkupFactor | decimal(19,2) | YES | - | NULL |
| IsBackOrdered | bit(1) | YES | - | NULL |
| IsOldItem | bit(1) | YES | - | NULL |
| SizePreset | varchar(255) | YES | - | NULL |
| WasteLengths | longtext | YES | - | NULL |
| MinimumAmt | double | YES | - | NULL |
| Notes | varchar(280) | YES | - | NULL |
| TraderID | varchar(40) | YES | - | NULL |
| TraderFavourite | bit(1) | YES | - | NULL |
| OthersItemFavourite | bit(1) | YES | - | NULL |
| TraderOthersItemFavourite | bit(1) | YES | - | NULL |
| OverrideDefaultLengths | bit(1) | YES | - | NULL |
| Nickname | varchar(255) | YES | - | NULL |
| CustomCostUnitPriceModelEdited | bit(1) | YES | - | NULL |
| WastageCalculation | int | YES | - | NULL |
| WastagePercentage | decimal(19,5) | YES | - | NULL |
| FilletFavourite | bit(1) | YES | - | NULL |
| DateDeleted | datetime | YES | - | NULL |
| DateDiscontinued | datetime | YES | - | NULL |
| Profile | varchar(255) | YES | - | NULL |

### itempricing

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| UsedPriceModelID | varchar(40) | YES | MUL | NULL |
| WastedPriceModelID | varchar(40) | YES | MUL | NULL |
| CostPriceModelID | varchar(40) | YES | MUL | NULL |
| ChopPriceModelID | varchar(40) | YES | MUL | NULL |

### itemtags

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ItemID | varchar(40) | NO | MUL | NULL |
| TagID | varchar(40) | NO | MUL | NULL |

### job

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| SaleID | varchar(40) | NO | MUL | NULL |
| ArtworkUnit | varchar(255) | YES | - | NULL |
| ArtworkWidth | decimal(19,5) | YES | - | NULL |
| ArtworkHeight | decimal(19,5) | YES | - | NULL |
| Copies | int | YES | - | NULL |
| Storage | varchar(255) | YES | - | NULL |
| ArtworkId | varchar(40) | YES | MUL | NULL |
| ArtworkCondition | int | YES | - | NULL |
| Notes | text | YES | - | NULL |
| Description | varchar(255) | YES | MUL | NULL |
| Completed | tinyint(1) | YES | MUL | NULL |
| CompletedTime | datetime | YES | MUL | NULL |
| Collected | tinyint(1) | YES | - | NULL |
| CollectedTime | datetime | YES | MUL | NULL |
| RoundJobPricing | tinyint(1) | NO | - | 0 |
| JobSalesNumber | int | YES | - | NULL |
| OverridenPrice | tinyint(1) | YES | - | NULL |
| StaticTotal | decimal(19,5) | YES | - | NULL |
| CommonWidth | decimal(19,5) | YES | - | NULL |
| CommonHeight | decimal(19,5) | YES | - | NULL |
| LabourChargeEach | decimal(19,5) | YES | - | NULL |
| JobTotal | decimal(19,5) | YES | - | NULL |
| JobSubTotal | decimal(19,5) | YES | - | NULL |
| JobDiscount | decimal(19,5) | YES | - | NULL |
| JobTax | decimal(19,5) | YES | - | NULL |
| GLCode | varchar(255) | YES | - | NULL |
| SaleCuttingListCompleted | tinyint(1) | YES | - | NULL |
| ImageID | varchar(40) | YES | MUL | NULL |
| JobDiscountSet | decimal(19,5) | YES | - | NULL |
| MarkupFactor | decimal(19,5) | YES | - | NULL |
| OverrideDiscount | decimal(19,5) | YES | - | NULL |
| JobsRoundingOption | int | YES | - | NULL |
| OnlyRoundDownJobs | tinyint(1) | YES | - | NULL |
| AddToKanban | bit(1) | YES | - | NULL |
| DateAdded | datetime | YES | - | NULL |
| KanbanColumn | varchar(40) | YES | - | NULL |
| CardOrder | int | YES | - | NULL |
| SaleCuttingListCompletedDate | datetime | YES | - | NULL |
| OverrideJobPrice | tinyint(1) | YES | - | 0 |
| OverrideJobDiscountPrice | tinyint(1) | YES | - | 0 |
| TaxAmount | double | YES | - | NULL |
| OverridenPriceSalePageExTax | bit(1) | YES | - | NULL |
| PriceOverrideChangedInExTax | bit(1) | YES | - | NULL |
| TraderCompleted | bit(1) | YES | - | NULL |
| TraderCollected | bit(1) | YES | - | NULL |
| TraderCompletedTime | datetime | YES | - | NULL |
| TraderCollectedTime | datetime | YES | - | NULL |
| DiscountOverriden | bit(1) | YES | - | NULL |

### jobline

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| JobQuantity | int | YES | - | NULL |
| JobID | varchar(40) | YES | MUL | NULL |
| LineNumber | int | YES | - | NULL |

### jobtags

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| JobId | varchar(40) | NO | MUL | NULL |
| TagID | varchar(40) | NO | MUL | NULL |

### kanbanassignedlabel

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| KanbanCardID | varchar(40) | NO | MUL | NULL |
| KanbanCardLabelID | varchar(40) | NO | MUL | NULL |

### kanbancard

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| name | varchar(255) | YES | - | NULL |
| FramerID | varchar(40) | YES | - | NULL |
| KanbanColumn | varchar(40) | YES | - | NULL |
| Deleted | bit(1) | YES | - | NULL |
| CardOrder | int | YES | - | NULL |
| Description | varchar(255) | YES | - | NULL |
| JobID | varchar(40) | YES | - | NULL |
| DateAdded | datetime | YES | - | NULL |

### kanbancardlabel

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Name | varchar(255) | YES | - | NULL |
| Color | varchar(40) | YES | - | NULL |
| FramerID | varchar(40) | YES | - | NULL |
| Deleted | bit(1) | YES | - | NULL |

### kanbanlist

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Name | varchar(255) | YES | - | NULL |
| Deleted | bit(1) | YES | - | NULL |
| FramerID | varchar(40) | NO | - | NULL |
| IndexColumn | int | YES | - | NULL |

### kpisale

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| SaleID | varchar(40) | YES | - | NULL |
| FramerID | varchar(40) | YES | - | NULL |
| OrderRow | int | YES | - | NULL |
| PeriodValue | decimal(19,5) | YES | - | NULL |

### labour

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| ActualHoursFramingWeekly | decimal(10,0) | YES | - | NULL |
| NumWeeksTradingYearly | decimal(10,0) | YES | - | NULL |
| StandardLabour | tinyint(1) | YES | - | NULL |

### labourexpenses

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Name | varchar(255) | YES | - | NULL |
| Amount | decimal(12,2) | YES | - | NULL |
| LabourID | varchar(40) | YES | - | NULL |
| Deleted | bit(1) | YES | - | NULL |

### labourline

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |

### labourscalebreak

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| BreakPoint | decimal(19,5) | YES | - | NULL |
| Units | decimal(19,5) | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| ScaleBreakID | varchar(40) | YES | MUL | NULL |

### layout

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Name | varchar(255) | YES | - | NULL |
| System | tinyint(1) | YES | - | NULL |
| AssetLocation | varchar(255) | YES | - | NULL |
| HTML | text | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| ThumbnailID | varchar(40) | YES | MUL | NULL |
| FramerID | varchar(40) | NO | MUL | NULL |

### legacysaleshistory

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Description | text | YES | - | NULL |
| ImportSource | int | YES | - | NULL |
| ImportId | varchar(255) | YES | - | NULL |
| Copies | decimal(19,5) | YES | - | NULL |
| Reference | varchar(255) | YES | - | NULL |
| Total | decimal(19,5) | YES | - | NULL |
| Tax | decimal(19,5) | YES | - | NULL |
| Notes | text | YES | - | NULL |
| Discount | decimal(19,5) | YES | - | NULL |
| Paid | decimal(19,5) | YES | - | NULL |
| ArtworkWidth | decimal(19,5) | YES | - | NULL |
| ArtworkHeight | decimal(19,5) | YES | - | NULL |
| OuterWidth | decimal(19,5) | YES | - | NULL |
| OuterHeight | decimal(19,5) | YES | - | NULL |

### legacysaleshistoryline

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Code | varchar(255) | YES | - | NULL |
| Quantity | decimal(19,5) | YES | - | NULL |
| UnitPrice | decimal(19,5) | YES | - | NULL |
| Unit | varchar(255) | YES | - | NULL |
| Description | varchar(255) | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| ItemID | varchar(40) | YES | MUL | NULL |
| LegacySalesHistoryID | varchar(40) | YES | MUL | NULL |

### link

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| UrlID | int | YES | - | NULL |
| SecurityToken | int unsigned | YES | - | NULL |
| FullUrl | varchar(512) | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |

### locationtag

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Name | varchar(255) | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |

### logger

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| LogId | int | NO | PRI | NULL |
| Level | varchar(255) | YES | - | NULL |
| CallSite | varchar(255) | YES | - | NULL |
| Type | varchar(255) | YES | - | NULL |
| Message | varchar(255) | YES | - | NULL |
| LineNumber | varchar(255) | YES | - | NULL |
| AdditionalInfo | longtext | YES | - | NULL |
| StackTrace | longtext | YES | - | NULL |
| InnerException | longtext | YES | - | NULL |
| LoggedOnDate | datetime | YES | - | NULL |

### markuppricebreak

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| MarkupFactor | decimal(19,5) | YES | - | NULL |

### matboard

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| SheetWidth | decimal(19,5) | YES | - | NULL |
| SheetHeight | decimal(19,5) | YES | - | NULL |
| SheetSizeUnit | varchar(255) | YES | - | NULL |
| PackSize | int | YES | - | NULL |

### matboardline

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| LeftMargin | decimal(19,5) | NO | - | NULL |
| RightMargin | decimal(19,5) | YES | - | NULL |
| TopMargin | decimal(19,5) | YES | - | NULL |
| BottomMargin | decimal(19,5) | YES | - | NULL |
| Rebate | tinyint(1) | YES | - | NULL |
| FilletLineID | varchar(40) | YES | MUL | NULL |
| HasFillet | tinyint(1) | YES | - | NULL |
| InnerVisibleHeight | decimal(19,5) | YES | - | NULL |
| InnerVisibleWidth | decimal(19,5) | YES | - | NULL |
| OuterVisibleHeight | decimal(19,5) | YES | - | NULL |
| OuterVisibleWidth | decimal(19,5) | YES | - | NULL |
| ReverseBevel | tinyint(1) | YES | - | NULL |
| TotalWidth | decimal(19,5) | YES | - | NULL |
| TotalHeight | decimal(19,5) | YES | - | NULL |
| Chops | tinyint(1) | YES | - | NULL |

### messagetemplate

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Name | varchar(255) | YES | - | NULL |
| TemplateBody | text | YES | - | NULL |
| EmailOrSms | int | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| FramerID | varchar(40) | YES | MUL | NULL |
| TraderID | varchar(40) | YES | - | NULL |

### miscellaneousline

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| SizeToArtwork | tinyint(1) | YES | - | NULL |
| SizeToGlass | tinyint(1) | YES | - | NULL |
| SizeTo | int | YES | - | NULL |

### moulding

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Width | decimal(19,5) | YES | - | NULL |
| Recess | decimal(19,5) | YES | - | NULL |
| Rebate | decimal(19,5) | YES | - | NULL |
| WidthUnit | varchar(255) | YES | - | NULL |
| PackSize | int | YES | - | NULL |
| ChopPriceModelID | varchar(40) | YES | MUL | NULL |
| DefaultMouldingLength | decimal(19,5) | YES | - | NULL |
| Height | decimal(18,2) | YES | - | 0.00 |
| RebateHeight | decimal(18,2) | YES | - | 0.00 |

### mouldingline

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Slip | tinyint(1) | YES | - | NULL |
| FilletLineID | varchar(40) | YES | MUL | NULL |
| HasFillet | tinyint(1) | YES | - | NULL |
| StretchBar | tinyint(1) | YES | - | NULL |
| OuterFrameWidth | decimal(19,5) | YES | - | NULL |
| OuterFrameHeight | decimal(19,5) | YES | - | NULL |
| RebateAllowance | decimal(19,5) | YES | - | NULL |
| Chops | tinyint(1) | YES | - | NULL |
| ChopTopAquired | tinyint(1) | YES | - | NULL |
| ChopBottomAquired | tinyint(1) | YES | - | NULL |
| ChopLeftAquired | tinyint(1) | YES | - | NULL |
| ChopRightAquired | tinyint(1) | YES | - | NULL |
| NewRebate | decimal(19,5) | YES | - | NULL |
| TotalWidth | decimal(19,5) | YES | - | NULL |
| TotalHeight | decimal(19,5) | YES | - | NULL |

### note

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Body | varchar(255) | YES | - | NULL |

### notification

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Content | varchar(255) | YES | - | NULL |
| IncludeStaff | tinyint(1) | YES | - | NULL |
| Cancelled | tinyint(1) | YES | - | NULL |
| Date | datetime | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| Alerts | bit(1) | YES | - | NULL |
| FramerID | varchar(40) | YES | - | NULL |

### organisation

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| TradingName | varchar(255) | YES | MUL | NULL |
| Deleted | tinyint(1) | NO | - | NULL |

### payment

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| PaymentDate | datetime | YES | MUL | NULL |
| PaymentType | int | YES | - | NULL |
| Amount | decimal(19,5) | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| SaleID | varchar(40) | NO | MUL | NULL |
| GLCode | varchar(255) | YES | - | NULL |
| XeroPaymentID | varchar(255) | YES | - | NULL |
| PaidUsingScript | tinyint(1) | YES | - | NULL |
| IsFixed | bit(1) | YES | - | b'0' |
| PaidByTrader | bit(1) | YES | - | NULL |

### person

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| FirstName | varchar(255) | YES | MUL | NULL |
| LastName | varchar(255) | YES | MUL | NULL |
| EmailAddress | varchar(255) | YES | MUL | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| ContactDetailsID | varchar(40) | YES | MUL | NULL |
| OrganisationID | varchar(40) | YES | MUL | NULL |
| DateCreated | date | YES | - | NULL |
| FullName | varchar(200) | YES | MUL | NULL |

### plan

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Name | varchar(255) | YES | - | NULL |
| Slug | varchar(255) | YES | - | NULL |
| MonthlyCharge | decimal(19,5) | YES | - | NULL |
| AnnualCharge | decimal(19,5) | YES | - | NULL |
| UserLimit | int | YES | - | NULL |
| IncludedSMS | int | YES | - | NULL |
| IsTrial | tinyint(1) | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| IsTraderPlan | bit(1) | YES | - | NULL |
| NewMonthlyCharge | decimal(19,5) | YES | - | NULL |
| NewAnnualCharge | decimal(19,5) | YES | - | NULL |

### pricebreak

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| BreakPoint | decimal(19,5) | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| BreakPriceID | varchar(40) | YES | MUL | NULL |

### pricemodel

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| SavedPriceModelID | varchar(40) | YES | MUL | NULL |
| DefaultPriceModelReferenceID | varchar(40) | YES | - | NULL |

### producttypes

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| FramerSupplierID | varchar(40) | NO | MUL | NULL |
| ProductType | int | YES | - | NULL |

### profile

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| PersonID | varchar(40) | YES | MUL | NULL |
| LastActivity | datetime | YES | MUL | NULL |

### purchaseorder

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Date | datetime | YES | MUL | NULL |
| Number | varchar(255) | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| FramerID | varchar(40) | YES | MUL | NULL |
| SupplierID | varchar(40) | YES | MUL | NULL |
| IsDone | bit(1) | YES | - | NULL |

### purchaseorderline

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| UnitName | varchar(255) | YES | - | NULL |
| Quantity | decimal(19,5) | YES | - | NULL |
| ItemName | varchar(255) | YES | - | NULL |
| ItemCode | varchar(255) | YES | - | NULL |
| SalesCount | int | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| PurchaseOrderID | varchar(40) | YES | MUL | NULL |
| ItemID | varchar(40) | YES | MUL | NULL |
| ItemType | varchar(255) | YES | - | NULL |
| Chops | tinyint(1) | YES | - | NULL |
| Length | int | YES | - | NULL |
| Width | int | YES | - | NULL |
| Allowance | varchar(255) | YES | - | NULL |
| ChopLength | varchar(255) | YES | - | NULL |
| ChopWidth | varchar(255) | YES | - | NULL |
| ChopHeight | varchar(255) | YES | - | NULL |
| Status | int | YES | - | NULL |

### purchaseordersupplier

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| FramerID | varchar(40) | YES | - | NULL |
| SupplierID | varchar(40) | YES | - | NULL |
| Count | int | YES | - | NULL |
| Deleted | tinyint | NO | - | NULL |

### renewal

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| CommencementDate | datetime | YES | - | NULL |
| PlanID | varchar(40) | YES | MUL | NULL |

### sale

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| SaleType | int | YES | - | NULL |
| Number | varchar(255) | YES | MUL | NULL |
| Created | datetime | YES | MUL | NULL |
| Due | datetime | YES | - | NULL |
| DeliverBy | datetime | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| CustomerID | varchar(40) | NO | MUL | NULL |
| LastAccessedOn | datetime | YES | - | NULL |
| FramerID | varchar(40) | YES | MUL | NULL |
| Discount | decimal(19,5) | YES | - | NULL |
| Tax | decimal(19,5) | YES | - | NULL |
| Hidden | tinyint(1) | YES | - | NULL |
| Notes | mediumtext | YES | - | NULL |
| FullyPaid | tinyint(1) | YES | - | NULL |
| SaleLineTotal | decimal(19,5) | YES | - | NULL |
| SaleTotal | decimal(19,5) | YES | - | NULL |
| SaleSubTotal | decimal(19,5) | YES | - | NULL |
| SaleDiscount | decimal(19,5) | YES | - | NULL |
| SaleTax | decimal(19,5) | YES | - | NULL |
| XeroInvoiceID | varchar(255) | YES | - | NULL |
| MarkupFactor | decimal(19,5) | YES | - | NULL |
| SalesRoundingOption | int | YES | - | NULL |
| PricingVersion | int | YES | - | NULL |
| OnlyRoundDown | tinyint(1) | YES | - | NULL |
| SaleRoundingAmount | decimal(19,5) | YES | - | NULL |
| CompleteAllJobs | tinyint(1) | YES | - | NULL |
| CollectAllJobs | tinyint(1) | YES | - | NULL |
| PaidUsingScript | tinyint(1) | YES | - | NULL |
| SalesAlertActive | tinyint(1) | YES | - | NULL |
| CustomerPONum | varchar(45) | YES | - | NULL |
| UnreadTraderSale | bit(1) | YES | - | NULL |
| Unread | bit(1) | YES | - | NULL |
| TraderID | varchar(40) | YES | - | NULL |
| Locked | tinyint(1) | YES | - | NULL |
| LockedSalesRoundingOption | int | YES | - | NULL |
| LockedOnlyRoundDownSale | tinyint(1) | YES | - | NULL |
| LockedJobsRoundingOption | int | YES | - | NULL |
| LockedOnlyRoundDownJobs | tinyint(1) | YES | - | NULL |
| LockedMarkupFactor | decimal(19,5) | YES | - | NULL |
| TraderCustomerID | varchar(40) | YES | MUL | NULL |
| SubTotalJobs_Static | decimal(19,5) | YES | - | NULL |
| SubTotalTaxJobs_Static | decimal(19,5) | YES | - | NULL |
| CalculatedRounded_Static | decimal(19,5) | YES | - | NULL |
| ComputationsInitialized | bit(1) | YES | - | NULL |
| Payable_Static | decimal(19,5) | YES | - | NULL |
| XeroFixedDoublePayment | bit(1) | YES | - | NULL |
| RemoveTax | bit(1) | YES | - | NULL |
| SaleAccessed | bit(1) | YES | - | NULL |
| ContactName | text | YES | - | NULL |
| ContactPhone | text | YES | - | NULL |
| ContactEmail | text | YES | - | NULL |

### saleline

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| UsedQuantity | decimal(19,5) | NO | - | NULL |
| UsedUnitPrice | decimal(19,5) | NO | - | NULL |
| WastedQuantity | decimal(19,5) | NO | - | NULL |
| WastedUnitPrice | decimal(19,5) | NO | - | NULL |
| Adjustment | decimal(19,5) | NO | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| JobID | varchar(40) | YES | MUL | NULL |
| SaleID | varchar(40) | NO | MUL | NULL |
| ItemID | varchar(40) | NO | MUL | NULL |
| Discount | decimal(19,5) | YES | - | NULL |
| Tax | decimal(19,5) | YES | - | NULL |
| Acquired | tinyint(1) | YES | - | NULL |
| PurchaseOrderLineID | varchar(40) | YES | MUL | NULL |
| Cost | decimal(19,5) | YES | - | NULL |
| LabourHours | decimal(19,5) | YES | - | NULL |
| CreatedDate | datetime | YES | - | NULL |
| GLCode | varchar(255) | YES | - | NULL |
| SaleCuttingListCompleted | tinyint(1) | YES | - | 0 |
| Chops | tinyint(1) | YES | - | NULL |
| DiscountSet | decimal(19,5) | YES | - | NULL |
| OverrideDiscount | decimal(19,5) | YES | - | NULL |
| WastedUnitPriceMarkup | decimal(19,5) | YES | - | NULL |
| MarkupFactor | decimal(19,5) | YES | - | NULL |
| UsedUnitPriceMarkup | decimal(19,5) | YES | - | NULL |
| SaleCuttingListCompletedDate | datetime | YES | - | NULL |
| OverridePrice | tinyint(1) | YES | - | 0 |
| OverrideDiscountPrice | tinyint(1) | YES | - | 0 |
| TaxAmount | double | YES | - | NULL |
| InStock | tinyint(1) | YES | - | NULL |
| InStockDate | datetime | YES | - | NULL |

### salesalert

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| SaleID | varchar(40) | YES | MUL | NULL |
| AlertText | varchar(255) | YES | - | NULL |

### saleshistory

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| SaleID | varchar(40) | YES | MUL | NULL |
| Type | int | YES | - | NULL |

### saletags

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| SaleId | varchar(40) | NO | MUL | NULL |
| TagID | varchar(40) | NO | MUL | NULL |

### scale

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Tiered | tinyint(1) | YES | - | NULL |
| Unit | varchar(255) | NO | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| BaseMeasurment | int | YES | - | NULL |

### scalebreak

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| BreakPoint | decimal(19,5) | YES | - | NULL |
| Units | decimal(19,5) | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| ScaleBreakID | varchar(40) | YES | MUL | NULL |

### smshistory

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Sender | varchar(255) | YES | - | NULL |
| Recipient | varchar(255) | YES | - | NULL |
| SmsPackID | varchar(40) | YES | MUL | NULL |
| CalculatedMessageCount | int | YES | - | NULL |

### smspack

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Number | int | YES | - | NULL |
| Used | int | YES | - | NULL |

### smstemplate

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(255) | NO | PRI | NULL |
| Name | varchar(255) | YES | - | NULL |
| TemplateBody | text | YES | - | NULL |
| Deleted | tinyint(1) | YES | - | NULL |
| FramerID | varchar(40) | YES | MUL | NULL |

### staff

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| RestrictedByHost | tinyint(1) | YES | - | NULL |
| RestrictedByTime | tinyint(1) | YES | - | NULL |
| FramerID | varchar(40) | YES | MUL | NULL |
| Permissions | bigint | YES | - | NULL |
| Active | tinyint(1) | YES | - | NULL |
| SupplierID | varchar(40) | YES | - | NULL |
| TraderID | varchar(40) | YES | MUL | NULL |
| TraderPermissions | bigint | YES | - | NULL |
| SupplierPermission | bigint | YES | - | NULL |
| FramerPermissionsExtended | bigint | YES | - | NULL |

### staticbreakprice

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| BaseUnitPrice | decimal(19,5) | YES | - | NULL |

### staticprice

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| UnitPrice | decimal(19,5) | YES | - | NULL |
| SavedIncludingTax | tinyint(1) | YES | - | NULL |

### staticpricebreak

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| UnitPrice | decimal(19,5) | YES | - | NULL |

### staticscaleprice

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| BaseUnitPrice | decimal(19,5) | YES | - | NULL |

### steppricebreak

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| StepAmount | decimal(19,5) | YES | - | NULL |

### supplier

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Name | varchar(255) | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| Website | varchar(255) | YES | - | NULL |
| ContactDetailsID | varchar(40) | YES | MUL | NULL |
| Email | varchar(255) | YES | - | NULL |
| Archived | tinyint(1) | YES | - | NULL |
| OwnerID | varchar(40) | YES | MUL | NULL |

### suppliercountrytags

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| SupplierId | varchar(40) | YES | MUL | NULL |
| CountryTagsID | varchar(40) | YES | MUL | NULL |

### supplierdefaultvalues

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| deleted | bit(1) | YES | - | NULL |
| supplierid | varchar(40) | YES | - | NULL |
| itemtype | int | YES | - | NULL |
| columnname | varchar(255) | YES | - | NULL |
| defaultvalue | varchar(255) | YES | - | NULL |

### supportpage

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| Id | varchar(40) | NO | PRI | NULL |
| PageName | varchar(50) | YES | - | NULL |
| RoutingUrl | varchar(1000) | YES | - | NULL |
| IsActive | tinyint(1) | YES | - | NULL |
| Deleted | tinyint(1) | YES | - | NULL |

### suppressionlist

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| FramerID | varchar(40) | YES | MUL | NULL |
| elt | varchar(255) | YES | - | NULL |
| id | varchar(255) | YES | - | NULL |
| TraderID | varchar(40) | YES | - | NULL |

### systemitem

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |

### systemsupplier

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| LastUpdated | datetime | YES | - | NULL |
| Slug | varchar(255) | YES | - | NULL |

### tag

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Name | varchar(255) | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| PriceModelID | varchar(40) | YES | MUL | NULL |
| FramerID | varchar(40) | YES | MUL | NULL |

### trader

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Name | varchar(255) | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| Website | varchar(255) | YES | - | NULL |
| ContactDetailsID | varchar(40) | YES | - | NULL |
| Email | varchar(255) | YES | - | NULL |
| Archived | tinyint(1) | YES | - | NULL |
| Slug | varchar(255) | YES | - | NULL |
| OwnerID | varchar(40) | YES | - | NULL |
| CurrencyNumberFormatID | varchar(40) | YES | - | NULL |
| DefaultUnitBase | int | YES | - | NULL |
| ValueAddedTaxName | varchar(45) | YES | - | NULL |
| ValueAddedTaxPriceModelID | varchar(40) | YES | MUL | NULL |
| SmsAddPrefix | varchar(45) | YES | - | NULL |
| SmsRemovePrefix | varchar(45) | YES | - | NULL |
| SendSmsFrom | varchar(45) | YES | - | NULL |
| CustomerID | varchar(40) | YES | - | NULL |
| Disabled | bit(1) | YES | - | NULL |
| FramerID | varchar(40) | YES | MUL | NULL |
| CountryCode | varchar(45) | YES | - | NULL |
| TimeZoneId | varchar(255) | YES | - | NULL |
| MouldingPresetItemID | varchar(40) | YES | - | NULL |
| MatboardPresetItemID | varchar(40) | YES | - | NULL |
| FilletPresetItemID | varchar(40) | YES | - | NULL |
| BackingPresetItemID | varchar(40) | YES | - | NULL |
| CoveringPresetItemID | varchar(40) | YES | - | NULL |
| MiscellaneousPresetItemID | varchar(40) | YES | - | NULL |
| Last4DigitsOfCard | varchar(40) | YES | - | NULL |
| PaymentToken | varchar(255) | YES | - | NULL |
| CardExpiry | varchar(255) | YES | - | NULL |
| BackgroundImageID | varchar(40) | YES | - | NULL |
| LogoID | varchar(40) | YES | - | NULL |
| SendInvoiceLink | bit(1) | YES | - | NULL |
| EmailFormat | int | YES | - | NULL |
| SendEmailFrom | varchar(255) | YES | - | NULL |
| SelfEmail | bit(1) | YES | - | NULL |
| PlanID | varchar(40) | YES | MUL | NULL |
| BillingPeriod | int | YES | - | NULL |

### tradercustomeritemtags

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| CustomerID | varchar(40) | NO | MUL | NULL |
| TagID | varchar(40) | NO | MUL | NULL |

### user

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| PasswordHash | varchar(255) | YES | - | NULL |
| UserName | varchar(255) | YES | MUL | NULL |
| SendyEmail | varchar(255) | YES | - | NULL |
| SendyHash | varchar(255) | YES | - | NULL |
| IsOnline | bit(1) | YES | - | NULL |
| LastOnline | datetime | YES | - | NULL |

### usernotification

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| UserID | varchar(40) | NO | MUL | NULL |
| NotificationID | varchar(40) | NO | MUL | NULL |

### xeroapisession

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| AccessKey | varchar(255) | YES | - | NULL |
| AccessSecret | varchar(255) | YES | - | NULL |
| Deleted | tinyint(1) | YES | - | NULL |
| ExpiryDate | datetime | YES | - | NULL |
| VerificationCode | varchar(45) | YES | - | NULL |
| FramerID | varchar(40) | YES | - | NULL |
| TokenType | tinyint(1) | YES | - | NULL |

### xeroglaccount

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Code | varchar(255) | YES | - | NULL |
| Name | varchar(255) | YES | - | NULL |
| Payable | tinyint(1) | YES | - | NULL |
| XeroID | varchar(40) | YES | - | NULL |
| Deleted | tinyint(1) | NO | - | NULL |
| FramerID | varchar(40) | NO | MUL | NULL |
| IsBankAccount | bit(1) | YES | - | NULL |

### xerotoken

| Column | Type | Null | Key | Default |
|--------|------|------|-----|--------|
| ID | varchar(40) | NO | PRI | NULL |
| Deleted | bit(1) | NO | - | NULL |
| AccessToken | text | YES | - | NULL |
| ExpiresAt | datetime | YES | - | NULL |
| IdToken | text | YES | - | NULL |
| RefreshToken | text | YES | - | NULL |
| TenantsJson | text | YES | - | NULL |
| FramerID | varchar(40) | YES | MUL | NULL |

