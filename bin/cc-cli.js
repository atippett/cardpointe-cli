#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

// Load commands
const billingPlanCommands = require('../commands/billingplan');

const program = new Command();

// Configure the CLI
program
  .name('cc-cli')
  .description('CardPointe CLI tool for managing billing plans and payments')
  .version('1.0.0');

// Load configuration
function loadConfig() {
  const configPath = path.join(__dirname, '../config/.profile');
  try {
    if (fs.existsSync(configPath)) {
      const fileContents = fs.readFileSync(configPath, 'utf8');
      const config = yaml.load(fileContents);
      
      // Set up environment variables from config if not already set
      if (config.client_id && !process.env.CARDCONNECT_CLIENT_ID) {
        process.env.CARDCONNECT_CLIENT_ID = config.client_id;
      }
      if (config.client_secret && !process.env.CARDCONNECT_CLIENT_SECRET) {
        process.env.CARDCONNECT_CLIENT_SECRET = config.client_secret;
      }
      if (config.username && !process.env.CARDCONNECT_USERNAME) {
        process.env.CARDCONNECT_USERNAME = config.username;
      }
      if (config.password && !process.env.CARDCONNECT_PASSWORD) {
        process.env.CARDCONNECT_PASSWORD = config.password;
      }
      if (config.sitename && !process.env.CARDCONNECT_SITE) {
        process.env.CARDCONNECT_SITE = config.sitename;
      }
      
      return config;
    }
  } catch (error) {
    console.error(chalk.red('Error loading configuration:'), error.message);
    process.exit(1);
  }
  return {};
}

// Global configuration
const config = loadConfig();

// Add billing plan commands
program
  .command('billingplan')
  .description('Manage billing plans')
  .action(() => {
    program.help();
  });

// List billing plans command
program
  .command('billingplan.list <merchantId>')
  .description('List all billing plans for a merchant')
  .option('-p, --profile <name>', 'Configuration profile to use', config.profilename || 'default')
  .action(async (merchantId, options) => {
    try {
      await billingPlanCommands.listBillingPlans(merchantId, options, config);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();
