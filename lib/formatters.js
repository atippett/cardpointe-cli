const chalk = require('chalk');

function getStatusColor(status) {
  switch (status) {
    case 'A': return chalk.green('Active');
    case 'C': return chalk.red('Cancelled');
    case 'F': return chalk.blue('Finished');
    default: return chalk.gray(status || 'Unknown');
  }
}

function getFrequencyText(timeSpan, every) {
  const frequencies = { 1: 'daily', 2: 'weekly', 3: 'monthly', 4: 'yearly' };
  const freq = frequencies[timeSpan] || 'unknown';
  return every === 1 ? freq : `every ${every} ${freq}`;
}

function formatDate(dateString) {
  if (!dateString) return 'Not set';
  if (dateString.length === 8) {
    const month = dateString.substring(0, 2);
    const day = dateString.substring(2, 4);
    const year = dateString.substring(4, 8);
    return `${month}/${day}/${year}`;
  }
  return dateString;
}

function formatTable(headers, rows) {
  if (rows.length === 0) return 'No data';
  const colWidths = headers.map((header, index) => {
    const maxHeaderWidth = header.length;
    const maxDataWidth = Math.max(...rows.map(row => (row[index] || '').toString().length));
    return Math.max(maxHeaderWidth, maxDataWidth) + 2;
  });
  let output = '';
  output += '┌' + colWidths.map(w => '─'.repeat(w)).join('┬') + '┐\n';
  output += '│' + headers.map((h, i) => h.padEnd(colWidths[i] - 1) + ' ').join('│') + '│\n';
  output += '├' + colWidths.map(w => '─'.repeat(w)).join('┼') + '┤\n';
  rows.forEach(row => {
    output += '│' + row.map((cell, i) => (cell || '').toString().padEnd(colWidths[i] - 1) + ' ').join('│') + '│\n';
  });
  output += '└' + colWidths.map(w => '─'.repeat(w)).join('┴') + '┘\n';
  return output;
}

const formatters = {
  pretty: {
    billingPlans: (data) => {
      if (!data || !data.billingPlans || data.billingPlans.length === 0) {
        return chalk.yellow('\nNo billing plans found for this merchant.');
      }
      let output = chalk.green(`\nFound ${data.billingPlans.length} billing plan(s):`);
      output += '\n' + chalk.gray('─'.repeat(80)) + '\n';
      data.billingPlans.forEach((plan, index) => {
        output += chalk.cyan(`\n${index + 1}. Billing Plan: ${plan.billingPlanName || 'Unnamed'}`);
        output += `\n   ID: ${chalk.bold(plan.billingPlanId)}`;
        output += `\n   Status: ${getStatusColor(plan.planStatus)}`;
        output += `\n   Amount: ${chalk.green('$' + plan.amount)}`;
        output += `\n   Frequency: ${getFrequencyText(plan.timeSpan, plan.every)}`;
        output += `\n   Start Date: ${formatDate(plan.startDate)}`;
        if (plan.untilCondition === 'N' && plan.untilNumPayments) {
          output += `\n   Payments: ${plan.untilNumPayments}`;
        } else if (plan.untilCondition === 'D' && plan.untilDate) {
          output += `\n   End Date: ${formatDate(plan.untilDate)}`;
        }
        if (plan.schedules && plan.schedules.length > 0) {
          output += `\n   Scheduled Payments: ${plan.schedules.length}`;
        }
      });
      output += '\n' + chalk.gray('\n' + '─'.repeat(80));
      return output;
    }
  },
  csv: {
    billingPlans: (data) => {
      if (!data || !data.billingPlans || data.billingPlans.length === 0) {
        return 'No billing plans found';
      }
      const headers = ['ID', 'Name', 'Status', 'Amount', 'Frequency', 'Start Date', 'End Date', 'Payments'];
      let output = headers.join(',') + '\n';
      data.billingPlans.forEach(plan => {
        const row = [
          plan.billingPlanId || '',
          (plan.billingPlanName || 'Unnamed').replace(/,/g, ';'),
          plan.planStatus || '',
          plan.amount || '',
          getFrequencyText(plan.timeSpan, plan.every),
          formatDate(plan.startDate),
          plan.untilDate ? formatDate(plan.untilDate) : '',
          plan.untilNumPayments || ''
        ];
        output += row.join(',') + '\n';
      });
      return output;
    }
  },
  table: {
    billingPlans: (data) => {
      if (!data || !data.billingPlans || data.billingPlans.length === 0) {
        return 'No billing plans found';
      }
      const headers = ['ID', 'Name', 'Status', 'Amount', 'Frequency', 'Start Date'];
      const rows = data.billingPlans.map(plan => [
        plan.billingPlanId || '',
        plan.billingPlanName || 'Unnamed',
        plan.planStatus || '',
        '$' + (plan.amount || '0'),
        getFrequencyText(plan.timeSpan, plan.every),
        formatDate(plan.startDate)
      ]);
      return formatTable(headers, rows);
    }
  }
};

module.exports = formatters;
