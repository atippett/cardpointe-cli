# CLI Commands Reference

Quick reference for implementing new CLI commands.

## Command Structure Pattern

```javascript
// In commands/[feature].js
const { Command } = require('commander');
const api = require('../lib/api-client');

module.exports = {
  async commandName(param1, param2, options, config) {
    // Implementation
  }
};
```

## Common Patterns

### API Client Usage
```javascript
const api = new CardPointeAPI(config);
const data = await api.request('GET', `/endpoint/${param}`);
```

### Error Handling
```javascript
try {
  // API call
} catch (error) {
  console.error(chalk.red('Error:'), error.message);
  process.exit(1);
}
```

### Loading Indicators
```javascript
const spinner = ora('Processing...').start();
// ... API call
spinner.succeed('Completed successfully');
```

### Output Formatting
```javascript
console.log(chalk.cyan('Header:'));
console.log(`   Field: ${chalk.bold(value)}`);
console.log(chalk.gray('─'.repeat(40)));
```

## Planned Commands

### Billing Plans
- ✅ `billingplan.list <merchantId>` - List all billing plans
- 🔄 `billingplan.get <merchantId> <billingPlanId>` - Get specific billing plan
- 🔄 `billingplan.create` - Create new billing plan
- 🔄 `billingplan.cancel <merchantId> <billingPlanId>` - Cancel billing plan

### Profiles
- 🔄 `profile.list <merchantId>` - List payment profiles
- 🔄 `profile.get <merchantId> <profileId>` - Get profile details
- 🔄 `profile.create` - Create new profile

### Transactions
- 🔄 `transaction.auth` - Authorize transaction
- 🔄 `transaction.capture <retref>` - Capture transaction
- 🔄 `transaction.void <retref>` - Void transaction
- 🔄 `transaction.refund <retref>` - Refund transaction

## Configuration Options
```yaml
profilename: "default"
	sitename: "cardpointe-uat"
	apiBaseUrl: "https://api-uat.cardconnect.com"
	apiVersion: "1.0"
	gatewaySite: "fts-uat"  # For CardPointe Gateway API
```

## Environment Variables

### CoPilot API (Billing Plans)
- `CARDCONNECT_TOKEN` - Bearer token for CoPilot API (required)

### CardPointe Gateway API (Transactions)
- `CARDCONNECT_USERNAME` - Gateway API username (required)
- `CARDCONNECT_PASSWORD` - Gateway API password (required)
- `CARDCONNECT_SITE` - Site subdomain (e.g., "fts-uat", "fts")
- `CARDCONNECT_MERCHID` - Merchant ID

## Authentication Notes
- **CoPilot API**: Uses Bearer token in Authorization header
- **Gateway API**: Uses credentials in request body for each call
- Different APIs require different authentication methods
