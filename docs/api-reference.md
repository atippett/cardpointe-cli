# CardPointe API Reference

## External Resources
- [Official CardPointe API Reference](https://developer.fiserv.com/product/CardPointe/docs/?path=docs/APIs/CardPointeGatewayAPI.md&branch=main)
- [CoPilot API Documentation](https://developer.cardpointe.com/copilotapi)
- [CardPointe Gateway API](https://developer.cardpointe.com/cardconnect-api)
- [Hosted iFrame Tokenizer](https://developer.cardpointe.com/hosted-iframe-tokenizer)
- [Terminal API](https://developer.cardpointe.com/terminal-api)

## Base URLs
- **Production**: `https://api.cardconnect.com`
- **UAT**: `https://api-uat.cardconnect.com`

## Authentication

### CoPilot API (Recurring Billing)
```http
Authorization: Bearer <token>
X-CopilotAPI-Version: 1.0
Content-Type: application/json
```

### CardPointe Gateway API (Transactions)
The CardPointe Gateway API uses credential-based authentication in request headers:
```http
Content-Type: application/json
```

**Required Credentials:**
- **merchId**: Your merchant ID
- **username**: API username
- **password**: API password  
- **site**: Site subdomain (e.g., "fts-uat" for test, "fts" for production)

**Authentication Method:**
Credentials are included in the request body for each API call:
```json
{
  "merchid": "123456789012",
  "username": "your_username",
  "password": "your_password",
  "site": "fts-uat"
}
```

## Common Endpoints

### Authorization
- `POST /auth` - Authenticate and get token

### Profile Management
- `POST /profile/create` - Create payment profile
- `GET /profile/{merchId}/{profileId}` - Get profile details
- `PUT /profile/{merchId}/{profileId}` - Update profile
- `DELETE /profile/{merchId}/{profileId}` - Delete profile

### Transaction Processing
- `POST /auth` - Authorization
- `POST /capture` - Capture authorized transaction
- `POST /void` - Void transaction
- `POST /refund` - Refund transaction

### Billing Plans (CoPilot API)
- `POST /billingplan/create` - Create billing plan
- `GET /billingplan/list/{merchId}` - List billing plans
- `GET /billingplan/{merchId}/{billingPlanId}` - Get billing plan
- `POST /billingplan/updateAccount` - Update payment account
- `POST /billingplan/markAsPaid` - Mark payment as paid
- `POST /billingplan/cancelPayment` - Cancel scheduled payment
- `POST /billingplan/cancel` - Cancel billing plan

## Response Formats

### Success Response
```json
{
  "resptext": "Approval",
  "respcode": "00",
  "retref": "123456789012"
}
```

### Error Response
```json
{
  "resptext": "Invalid merchant ID",
  "respcode": "01"
}
```

## Common Response Codes
- `00` - Approval
- `01` - Invalid merchant ID
- `02` - Invalid profile ID
- `03` - Profile not found
- `04` - Invalid amount
- `05` - Invalid card number
- `06` - Invalid expiry date
- `07` - Invalid CVV
- `08` - Declined
- `09` - Insufficient funds
- `10` - Card expired

## Rate Limits
- Standard: 100 requests per minute
- Burst: 200 requests per minute (short bursts)

## Data Types

### Amount
- Format: Decimal with 2 decimal places
- Example: `19.99`

### Date Formats
- API: `MMDDYYYY` (e.g., `01012025`)
- Display: `MM/DD/YYYY` (e.g., `01/01/2025`)

### Currency
- Default: USD
- Symbol: `$`

## Error Handling Best Practices
1. Always check `respcode` field
2. Handle network timeouts gracefully
3. Implement retry logic for transient failures
4. Log errors for debugging
5. Provide user-friendly error messages
