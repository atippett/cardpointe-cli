# CardPointe API Resources
- [CardPointe API Refenerce](https://developer.fiserv.com/product/CardPointe/docs/?path=docs/APIs/CardPointeGatewayAPI.md&branch=main)


# CoPilot API - Recurring Billing

This document provides an overview and usage examples for the **CoPilot API Billing Plan** endpoints. These endpoints allow you to create and manage recurring billing plans using tokenized and stored customer payment data.

---

## Overview

The CoPilot Billing Plan API supports the following features:

- Create a new billing plan  
- Retrieve a list of billing plans  
- Get detailed information on a specific billing plan  
- Update a payment account in a billing plan  
- Mark a payment as paid  
- Cancel a scheduled payment  
- Cancel a billing plan  

⚠️ **Note:** PCI DSS standards prohibit storing Card Verification Value (CVV) data. Neither the CardPointe Gateway nor the merchant may store CVV for recurring billing purposes.

---

## Authentication & Headers

All requests must include:

```http
Authorization: Bearer <token>
X-CopilotAPI-Version: 1.0
Content-Type: application/json
```

Host (UAT environment):  
```
https://api-uat.cardconnect.com
```

---

## Endpoints

### 1. Create Billing Plan
**POST** `/billingplan/create`

Creates a new billing plan using a stored payment profile.

- **Request Body**:  
  ```json
  {
    "billingPlan": {
      "merchId": "123456789012",
      "profileId": "1234567890",
      "acctId": "1",
      "amount": 19.99,
      "timeSpan": 2,
      "every": 1,
      "untilCondition": "C",
      "currencySymbol": "$",
      "startDate": "01012025",
      "billingPlanName": "Monthly Subscription",
      "options": [
        { "name": "email_receipt", "value": "1" }
      ]
    }
  }
  ```

---

### 2. Get Billing Plan List
**GET** `/billingplan/list/{merchId}`

Retrieves all billing plans for a merchant ID.

---

### 3. Get Billing Plan
**GET** `/billingplan/{merchId}/{billingPlanId}`

Retrieves detailed information for a specific billing plan, including its schedules.

---

### 4. Update Account
**POST** `/billingplan/updateAccount`

Updates the payment account used for a billing plan.

- **Example Request:**
  ```json
  {
    "merchId": "434315170887",
    "billingPlanId": "11992",
    "profileId": "11416055053282854657",
    "acctId": "2"
  }
  ```

---

### 5. Mark as Paid
**POST** `/billingplan/markAsPaid`

Marks a scheduled payment as `PAID`.

- **Example Request:**
  ```json
  {
    "billingPlanScheduleId": "1234567",
    "retref": "R123456789012"
  }
  ```

---

### 6. Cancel Payment
**POST** `/billingplan/cancelPayment`

Cancels a scheduled payment that is still in `Scheduled` status.

- **Example Request:**
  ```json
  {
    "billingPlanScheduleId": "1234567"
  }
  ```

---

### 7. Cancel Billing Plan
**POST** `/billingplan/cancel`

Cancels the entire billing plan and all remaining payments.

- **Example Request:**
  ```json
  {
    "merchId": "123456789012",
    "billingPlanId": "12345"
  }
  ```

---

## Billing Plan Object

| Field              | Type    | Required | Description                                                                 |
|--------------------|---------|----------|-----------------------------------------------------------------------------|
| billingPlanId      | string  | no       | Auto-generated ID for the billing plan.                                     |
| merchId            | string  | yes      | Merchant ID.                                                                |
| profileId          | string  | yes      | CardPointe profile ID.                                                      |
| acctId             | string  | no       | Account ID of payment method (default used if omitted).                     |
| amount             | number  | yes      | Amount per payment.                                                         |
| timeSpan           | number  | yes      | Billing frequency (1=daily, 2=weekly, 3=monthly, 4=yearly).                 |
  "scheduledAmount": 12.99,
| every              | number  | yes      | Interval multiplier (1=every, 2=every other).                               |
| untilCondition     | string  | yes      | End condition (`C`=cancel, `N`=number of payments, `D`=date).               |
| untilNumPayments   | number  | if `N`   | Number of payments before ending.                                           |
| untilDate          | string  | if `D`   | End date in `MMDDYYYY`.                                                     |
| currencySymbol     | string  | yes      | Transaction currency symbol.                                                |
| startDate          | string  | yes      | Start date in `MMDDYYYY`.                                                   |
| billingPlanName    | string  | yes      | Name of the billing plan.                                                   |
| options            | array   | yes      | Options array (e.g., `email_receipt`).                                      |
| planStatus         | string  | no       | Current status (`A`=Active, `C`=Cancelled, `F`=Finished).                   |
| schedules          | array   | no       | Billing plan schedule details.                                              |

---

## Example Billing Plan Schedule Object

```json
{
  "billingPlanScheduleId": 1234567,
  "actualAmount": null,
  "actualPaymentDate": null,
  "paymentStatus": "Scheduled",
  "retref": null,
  "scheduledPaymentDate": "03/08/2025"
}
```

---

## Resources

- [CardPointe Gateway API](https://developer.cardpointe.com/cardconnect-api)  
- [CoPilot API Documentation](https://developer.cardpointe.com/copilotapi)  
- [CardPointe Hosted iFrame Tokenizer](https://developer.cardpointe.com/hosted-iframe-tokenizer)  
- [Terminal API](https://developer.cardpointe.com/terminal-api)  

---
