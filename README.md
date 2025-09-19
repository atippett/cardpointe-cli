# cc-cli - CardPointe CLI Tool

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
   chmod +x bin/cc-cli.js
   ```

## Configuration

### Environment Variables

Create a `.env` file with your CardPointe API credentials:

```bash
CARDCONNECT_TOKEN=your_token_here
```

### Profile Configuration

Edit `config/.profile` to configure your API settings:

```yaml
profilename: "default"
	sitename: "cardpointe-uat"
	apiBaseUrl: "https://api-uat.cardconnect.com"
	apiVersion: "1.0"
```

## Usage

### List Billing Plans

```bash
# List all billing plans for a merchant
./bin/cc-cli.js billingplan.list <merchantId>

# Example
./bin/cc-cli.js billingplan.list 123456789012
```

### Available Commands

- `billingplan.list <merchantId>` - List all billing plans for a merchant

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
│   └── cc-cli.js          # Main CLI entry point
├── commands/
│   └── billingplan.js     # Billing plan commands
├── config/
│   ├── .profile           # Configuration file
│   └── profile.example.yaml
├── lib/                   # Utility libraries
├── package.json
└── README.md
```

### Adding New Commands

1. Create a new command file in `commands/`
2. Import and register the command in `bin/cc-cli.js`
3. Follow the existing pattern for API calls and output formatting

## License

MIT
