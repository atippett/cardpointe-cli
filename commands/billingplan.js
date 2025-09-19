const { CardPointeAPI } = require('../lib/api-client');
const chalk = require('chalk');
const ora = require('ora');

// Billing Plan Commands
const billingPlanCommands = {
  async listBillingPlans(merchantId, options, config) {
    // Check for required environment variable
    if (!process.env.CARDCONNECT_TOKEN) {
      console.error(chalk.red('Error: CARDCONNECT_TOKEN environment variable is required'));
      console.log(chalk.yellow('Please set your CardPointe API token:'));
      console.log(chalk.gray('export CARDCONNECT_TOKEN="your_token_here"'));
      process.exit(1);
    }

    const spinner = ora('Fetching billing plans...').start();
    
    try {
      const api = new CardPointeAPI(config);
      const endpoint = `/billingplan/list/${merchantId}`;
      
      spinner.text = `Fetching billing plans for merchant ${merchantId}...`;
      const data = await api.request('GET', endpoint);
      
      spinner.succeed('Billing plans retrieved successfully');
      
      // Display results
      if (data && data.billingPlans && data.billingPlans.length > 0) {
        console.log(chalk.green(`\nFound ${data.billingPlans.length} billing plan(s):`));
        console.log(chalk.gray('─'.repeat(80)));
        
        data.billingPlans.forEach((plan, index) => {
          console.log(chalk.cyan(`\n${index + 1}. Billing Plan: ${plan.billingPlanName || 'Unnamed'}`));
          console.log(`   ID: ${chalk.bold(plan.billingPlanId)}`);
          console.log(`   Status: ${getStatusColor(plan.planStatus)}`);
          console.log(`   Amount: ${chalk.green('$' + plan.amount)}`);
          console.log(`   Frequency: ${getFrequencyText(plan.timeSpan, plan.every)}`);
          console.log(`   Start Date: ${formatDate(plan.startDate)}`);
          
          if (plan.untilCondition === 'N' && plan.untilNumPayments) {
            console.log(`   Payments: ${plan.untilNumPayments}`);
          } else if (plan.untilCondition === 'D' && plan.untilDate) {
            console.log(`   End Date: ${formatDate(plan.untilDate)}`);
          }
          
          if (plan.schedules && plan.schedules.length > 0) {
            console.log(`   Scheduled Payments: ${plan.schedules.length}`);
          }
        });
        
        console.log(chalk.gray('\n' + '─'.repeat(80)));
      } else {
        console.log(chalk.yellow('\nNo billing plans found for this merchant.'));
      }
      
    } catch (error) {
      spinner.fail('Failed to fetch billing plans');
      throw error;
    }
  }
};

// Helper functions
function getStatusColor(status) {
  switch (status) {
    case 'A': return chalk.green('Active');
    case 'C': return chalk.red('Cancelled');
    case 'F': return chalk.blue('Finished');
    default: return chalk.gray(status || 'Unknown');
  }
}

function getFrequencyText(timeSpan, every) {
  const frequencies = {
    1: 'daily',
    2: 'weekly', 
    3: 'monthly',
    4: 'yearly'
  };
  
  const freq = frequencies[timeSpan] || 'unknown';
  return every === 1 ? freq : `every ${every} ${freq}`;
}

function formatDate(dateString) {
  if (!dateString) return 'Not set';
  
  // Convert MMDDYYYY to readable format
  if (dateString.length === 8) {
    const month = dateString.substring(0, 2);
    const day = dateString.substring(2, 4);
    const year = dateString.substring(4, 8);
    return `${month}/${day}/${year}`;
  }
  
  return dateString;
}

module.exports = billingPlanCommands;
