# cardpointe-cli - CardPointe CLI Tool

A command-line interface for managing CardPointe billing plans and payments using the CoPilot API.

## Installation

1. Clone this repository:
   ```bash
   git clone git@github.com:atippett/cardpointe-cli.git
   cd cardpointe-cli
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up your environment:
   ```bash
   cp env.example .env
   # Edit .env and add your CardPointe API token
   ```

4. Make the CLI executable:
   ```bash
   chmod +x bin/cardpointe-cli
   ```

## Configuration

### Global Configuration (checked in)

Shared config lives in `config/global.yaml` and is versioned. It includes API endpoints, token URLs, and command overrides.

### Profile Configuration (user-specific, not checked in)

Create `~/.cardpointe-cli` (or `config/local.yaml`) with your credentials:

```yaml
profiles:
  core:
    production: false  # true for production, false for UAT
    sitename: "cardpointe-uat"
    username: "your_username"
    password: "your_password"
    client_id: your_client_id
    client_secret: your_client_secret
```

Profile config is merged with `config/global.yaml`. User profiles override global defaults.

### Environment Variables

Create a `.env` file for API token (optional):

```bash
CARDCONNECT_TOKEN=your_token_here
```

**Environment Selection:**
- `production: true` → Uses `https://api.cardconnect.com` (Production)
- `production: false` → Uses `https://api-uat.cardconnect.com` (UAT)

**Profile Selection:**
- CLI defaults to the first profile in the configuration
- Use `-p <profileName>` to specify a different profile
- Example: `./bin/cardpointe-cli merchant.get 123456789012 -p production`

## Usage

### List Billing Plans

```bash
# List all billing plans for a merchant (uses default profile)
./bin/cardpointe-cli billingplan.list <merchantId>

# List billing plans using specific profile
./bin/cardpointe-cli billingplan.list <merchantId> -p <profileName>

# Examples
./bin/cardpointe-cli billingplan.list 123456789012
./bin/cardpointe-cli billingplan.list 123456789012 -p production
```

### Export Billing Plans from a CSV

Provide an input CSV where **row 1 is the header** and one column contains the billing plan ID (defaults: `billingPlanId`, `planId`, or `id`).
The file must also include a merchant id column (defaults: `merchant_id`, `merchantId`, `merchId`, `mid`, or `Location`).

```bash
# Export billing plan details for each row in input.csv
./bin/cardpointe-cli billingplan.export input.csv

# Or read from stdin (your preferred usage)
./bin/cardpointe-cli billingplan.export < input.csv

# Limit export to first N rows
./bin/cardpointe-cli billingplan.export --limit 10 < input.csv

# By default, output is written to stdout. To write a file:
./bin/cardpointe-cli billingplan.export input.csv -o output.csv
```

### Get Merchant Information

```bash
# Get merchant information (uses default profile)
./bin/cardpointe-cli merchant.get <merchantId>

# Get merchant information using specific profile
./bin/cardpointe-cli merchant.get <merchantId> -p <profileName>

# Examples
./bin/cardpointe-cli merchant.get 123456789012
./bin/cardpointe-cli merchant.get 123456789012 -p uat
```

### Cancel a Billing Plan

```bash
./bin/cardpointe-cli billingplan.cancel <merchantId> <billingPlanId>

# Example
./bin/cardpointe-cli billingplan.cancel 496180953887 24192607
```

### Available Commands

- `billingplan.list <merchantId>` - List all billing plans for a merchant
- `billingplan.get <merchantId> <billingPlanId>` - Get detailed information for a specific billing plan
- `billingplan.cancel <merchantId> <billingPlanId>` - Cancel a billing plan and all remaining payments
- `billingplan.export [inputCsv]` - Export billing plan details (reads stdin if inputCsv omitted)
- `merchant.get <merchantId>` - Get merchant information

## Features

- ✅ **YAML Configuration**: Easy-to-manage profile-based configuration
- ✅ **Environment Variables**: Secure API token management
- ✅ **Pretty Output**: Colorized and formatted command output
- ✅ **Loading Indicators**: Visual feedback during API calls
- ✅ **Error Handling**: Comprehensive error messages and validation
- ✅ **Extensible**: Easy to add new commands and features

## API Requirements

This tool requires:
- CardPointe API token (Bearer token)
- Valid merchant ID
- Access to the CoPilot API endpoints

## Development

### Project Structure

```
cardpointe-cli/
├── bin/
│   └── cardpointe-cli     # Main CLI entry point
├── commands/
│   └── billingplan.js     # Billing plan commands
├── config/
│   ├── global.yaml        # Shared config (checked in)
│   └── local.example.yaml
├── lib/                   # Utility libraries
├── package.json
└── README.md
```

### Adding New Commands

1. Create a new command file in `commands/`
2. Import and register the command in `bin/cardpointe-cli`
3. Follow the existing pattern for API calls and output formatting

## License

MIT
