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
      return yaml.load(fileContents);
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
