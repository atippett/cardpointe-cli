const { CardPointeAPI } = require('../lib/api-client');
const chalk = require('chalk');
const ora = require('ora');
const formatters = require('../lib/formatters');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { parseCsv, stringifyCsv } = require('../lib/csv');

// Helper function to apply command-specific configuration
function applyCommandConfig(config, commandName) {
  let configToUse = { ...config };
  
  if (config.command && config.command[commandName]) {
    const envKey = config.production ? 'production' : 'uat';
    
    // Check for environment-specific command config first
    if (config.command[commandName][envKey] && config.command[commandName][envKey].copilot_api_url) {
      // Override the global API URL for this specific command and environment
      configToUse = {
        ...config,
        global: {
          ...config.global,
          [envKey]: {
            ...config.global[envKey],
            copilot_api_url: config.command[commandName][envKey].copilot_api_url
          }
        }
      };
    } else if (config.command[commandName].copilot_api_url) {
      // Fallback to single command config (backward compatibility)
      configToUse = {
        ...config,
        global: {
          ...config.global,
          [envKey]: {
            ...config.global[envKey],
            copilot_api_url: config.command[commandName].copilot_api_url
          }
        }
      };
    }
  }
  
  return configToUse;
}

async function ensureAuthenticatedOrExit(api, spinner, config) {
  try {
    await api.getToken();
  } catch (authError) {
    if (spinner) spinner.fail('Authentication failed');
    console.error(chalk.red('Error: Authentication failed'));
    console.log(chalk.yellow('Please ensure you have either:'));
    console.log(chalk.gray('1. CARDCONNECT_TOKEN environment variable set, or'));
    console.log(chalk.gray('2. username and password configured in ~/.fiserv-cli or config-local.yaml'));
    console.log(chalk.gray('\nDebug info:'));
    console.log(chalk.gray('- Environment:'), config.production ? chalk.red('PRODUCTION') : chalk.yellow('UAT'));
    console.log(chalk.gray('- API Base URL:'), api.baseURL);
    // Determine token endpoint for debug display
    let tokenEndpoint;
    if (config.production === true && config.global && config.global.production && config.global.production.token_endpoint) {
      tokenEndpoint = config.global.production.token_endpoint.replace('<sitename>', config.sitename);
    } else if (config.production === false && config.global && config.global.uat && config.global.uat.token_endpoint) {
      tokenEndpoint = config.global.uat.token_endpoint.replace('<sitename>', config.sitename);
    } else {
      tokenEndpoint = `${api.baseURL}/token`;
    }
    console.log(chalk.gray('- Token Endpoint:'), tokenEndpoint);
    console.log(chalk.gray('- Username:'), config.username ? 'Set' : 'Not set');
    console.log(chalk.gray('- Password:'), config.password ? 'Set' : 'Not set');
    console.log(chalk.gray('- Config keys:'), Object.keys(config).join(', '));
    console.log(chalk.gray('\nAuthentication error:'), authError.message);
    process.exit(1);
  }
}

async function fetchBillingPlan(api, merchantId, billingPlanId) {
  const endpoint = `/billingplan/${merchantId}/${billingPlanId}`;
  const data = await api.request('GET', endpoint);
  return data?.billingPlan || null;
}

function getCardPointeRestBaseUrl(config) {
  const envKey = config.production ? 'production' : 'uat';
  const template = config?.global?.[envKey]?.cardpointe_api_url;
  if (!template) return null;

  const sitename = config.sitename || '';
  let url = String(template);
  if (sitename && url.includes('<site>')) {
    url = url.replace('<site>', sitename);
  }
  // Normalize trailing slash
  if (!url.endsWith('/')) url += '/';
  return url;
}

async function fetchProfileData(config, profileId, accountId, merchId, verbose = false) {
  const base = getCardPointeRestBaseUrl(config);
  if (!base) {
    throw new Error('No cardpointe_api_url configured (global.*.cardpointe_api_url)');
  }
  if (!profileId || !accountId || !merchId) {
    return null;
  }

  // Endpoint per user-provided pattern:
  // /cardconnect/rest/profile/{profileid}/{accountid}/{merchid}
  // base is expected to already include /cardconnect/rest/
  const endpointPath = `profile/${encodeURIComponent(profileId)}/${encodeURIComponent(accountId)}/${encodeURIComponent(merchId)}`;
  const url = `${base}${endpointPath}`;

  // CardPointe "cardconnect/rest" endpoints typically use Basic auth.
  const username = process.env.CARDCONNECT_GATEWAY_USERNAME || config.cardpointe_username || config.username;
  const password = process.env.CARDCONNECT_GATEWAY_PASSWORD || config.cardpointe_password || config.password;
  if (!username || !password) {
    throw new Error('No username/password available for profile lookup (use cardpointe.username/password in config)');
  }

  const headers = {
    Accept: 'application/json',
    Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
  };

  if (verbose) {
    console.error(chalk.gray('\nDebug - Profile Request:'));
    console.error(chalk.gray('URL:'), url);
    console.error(chalk.gray('Method:'), 'GET');
  }

  const response = await axios.get(url, { headers });
  return response.data;
}

function normalizeHeaderName(name) {
  // Normalize headers so variants like "Plan Id", "plan_id", "planId" all match
  // by stripping non-alphanumeric characters.
  return String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function findPlanIdColumnIndex(headers, explicitName) {
  const normalized = headers.map(normalizeHeaderName);

  if (explicitName) {
    const idx = normalized.indexOf(normalizeHeaderName(explicitName));
    if (idx !== -1) return idx;
  }

  const candidates = ['billingplanid', 'planid', 'id'];

  for (const candidate of candidates) {
    const idx = normalized.indexOf(candidate);
    if (idx !== -1) return idx;
  }

  return -1;
}

function findMerchantIdColumnIndex(headers, explicitName) {
  const normalized = headers.map(normalizeHeaderName);

  if (explicitName) {
    const idx = normalized.indexOf(normalizeHeaderName(explicitName));
    if (idx !== -1) return idx;
  }

  // Some exports store merchant id under "Location" (as seen in CoPilot UI exports)
  const candidates = ['merchantid', 'merchid', 'mid', 'location'];

  for (const candidate of candidates) {
    const idx = normalized.indexOf(candidate);
    if (idx !== -1) return idx;
  }

  return -1;
}

function flattenForCsv(value, prefix, out) {
  const key = String(prefix);

  if (value === null || value === undefined) {
    out[key] = '';
    return;
  }

  if (Array.isArray(value)) {
    out[key] = JSON.stringify(value);
    return;
  }

  const t = typeof value;
  if (t === 'string' || t === 'number' || t === 'boolean') {
    out[key] = String(value);
    return;
  }

  if (value instanceof Date) {
    out[key] = value.toISOString();
    return;
  }

  if (t === 'object') {
    const obj = value;
    const keys = Object.keys(obj);
    if (keys.length === 0) {
      out[key] = '{}';
      return;
    }
    keys.sort();
    for (const k of keys) {
      const nextPrefix = prefix ? `${prefix}.${k}` : k;
      flattenForCsv(obj[k], nextPrefix, out);
    }
    return;
  }

  out[key] = String(value);
}

// Billing Plan Commands
const billingPlanCommands = {
  async listBillingPlans(merchantId, options, config) {
    const spinner = ora('Fetching billing plans...').start();
    
    try {
      // Apply command-specific configuration
      const configToUse = applyCommandConfig(config, 'billingplan');
      const api = new CardPointeAPI(configToUse, options.verbose);
      
      // Test authentication before making the request
      await ensureAuthenticatedOrExit(api, spinner, config);
      // Build endpoint with optional pagination parameters
      let endpoint = `/billingplan/list/${merchantId}`;
      
      // Add pagination parameters if specified
      const paginationParams = [];
      if (options.pageNumber) {
        paginationParams.push(`pageNumber=${options.pageNumber}`);
      }
      if (options.page) {
        paginationParams.push(`page=${options.page}`);
      }
      if (options.size) {
        paginationParams.push(`size=${options.size}`);
      }
      if (options.limit) {
        paginationParams.push(`limit=${options.limit}`);
      }
      if (options.offset) {
        paginationParams.push(`offset=${options.offset}`);
      }
      if (options.skip) {
        paginationParams.push(`skip=${options.skip}`);
      }
      if (paginationParams.length > 0) {
        endpoint += `?${paginationParams.join('&')}`;
      }
      
      spinner.text = `Fetching billing plans for merchant ${merchantId}...`;
      const data = await api.request('GET', endpoint);
      
      spinner.succeed('Billing plans retrieved successfully');
      
      // Display results using the specified format
      const format = options.format || 'pretty';
      const output = formatters[format].billingPlans(data);
      console.log(output);
      
    } catch (error) {
      spinner.fail('Failed to fetch billing plans');
      throw error;
    }
  },

  async getBillingPlan(merchantId, billingPlanId, options, config) {
    const spinner = ora('Fetching billing plan details...').start();
    
    try {
      // Apply command-specific configuration
      const configToUse = applyCommandConfig(config, 'billingplan');
      const api = new CardPointeAPI(configToUse, options.verbose);
      
      // Test authentication before making the request
      await ensureAuthenticatedOrExit(api, spinner, config);

      spinner.text = `Fetching billing plan ${billingPlanId} for merchant ${merchantId}...`;
      const plan = await fetchBillingPlan(api, merchantId, billingPlanId);
      
      spinner.succeed('Billing plan retrieved successfully');
      
      // Display results
      if (plan) {
        console.log(chalk.green(`\nBilling Plan Details:`));
        console.log(chalk.gray('─'.repeat(80)));
        
        console.log(chalk.cyan(`Plan Name: ${chalk.bold(plan.billingPlanName || 'Unnamed')}`));
        console.log(chalk.cyan(`Plan ID: ${chalk.bold(plan.billingPlanId)}`));
        console.log(chalk.cyan(`Merchant ID: ${chalk.bold(plan.merchId)}`));
        console.log(chalk.cyan(`Profile ID: ${chalk.bold(plan.profileId)}`));
        console.log(chalk.cyan(`Account ID: ${chalk.bold(plan.acctId || 'Default')}`));
        console.log(chalk.cyan(`Amount: ${chalk.green('$' + plan.amount)}`));
        console.log(chalk.cyan(`Status: ${getStatusColor(plan.planStatus)}`));
        console.log(chalk.cyan(`Frequency: ${getFrequencyText(plan.timeSpan, plan.every)}`));
        console.log(chalk.cyan(`Start Date: ${formatDate(plan.startDate)}`));
        
        if (plan.untilCondition === 'N' && plan.untilNumPayments) {
          console.log(chalk.cyan(`Payments: ${plan.untilNumPayments}`));
        } else if (plan.untilCondition === 'D' && plan.untilDate) {
          console.log(chalk.cyan(`End Date: ${formatDate(plan.untilDate)}`));
        } else if (plan.untilCondition === 'C') {
          console.log(chalk.cyan(`End Condition: ${chalk.yellow('Cancel manually')}`));
        }
        
        console.log(chalk.cyan(`Currency: ${plan.currencySymbol || '$'}`));
        
        if (plan.options && plan.options.length > 0) {
          console.log(chalk.cyan(`\nOptions:`));
          plan.options.forEach((option, index) => {
            console.log(`  ${index + 1}. ${option.name}: ${option.value}`);
          });
        }
        
        // Display schedules if available
        if (plan.schedules && plan.schedules.length > 0) {
          console.log(chalk.cyan(`\nScheduled Payments (${plan.schedules.length}):`));
          console.log(chalk.gray('─'.repeat(60)));
          
          plan.schedules.forEach((schedule, index) => {
            console.log(chalk.cyan(`\n${index + 1}. Schedule ID: ${chalk.bold(schedule.billingPlanScheduleId)}`));
            console.log(`   Scheduled Date: ${formatDate(schedule.scheduledPaymentDate)}`);
            console.log(`   Status: ${getPaymentStatusColor(schedule.paymentStatus)}`);
            
            if (schedule.actualAmount) {
              console.log(`   Actual Amount: ${chalk.green('$' + schedule.actualAmount)}`);
            }
            if (schedule.actualPaymentDate) {
              console.log(`   Actual Date: ${formatDate(schedule.actualPaymentDate)}`);
            }
            if (schedule.retref) {
              console.log(`   Reference: ${chalk.bold(schedule.retref)}`);
            }
          });
        }
        
        console.log(chalk.gray('\n' + '─'.repeat(80)));
      } else {
        console.log(chalk.yellow('\nNo billing plan found with the specified ID.'));
      }
      
    } catch (error) {
      spinner.fail('Failed to fetch billing plan');
      throw error;
    }
  },

  async cancelBillingPlan(merchantId, billingPlanId, options, config) {
    const spinner = ora('Cancelling billing plan...').start();

    try {
      const configToUse = applyCommandConfig(config, 'billingplan');
      const api = new CardPointeAPI(configToUse, options.verbose);
      await ensureAuthenticatedOrExit(api, spinner, config);

      spinner.text = `Cancelling billing plan ${billingPlanId} for merchant ${merchantId}...`;
      await api.request('POST', '/billingplan/cancel', {
        merchId: merchantId,
        billingPlanId
      });

      spinner.succeed(chalk.green(`Billing plan ${billingPlanId} cancelled successfully`));
    } catch (error) {
      spinner.fail('Failed to cancel billing plan');
      throw error;
    }
  },

  async exportBillingPlans(inputCsvPath, options, config) {
    const spinner = ora('Exporting billing plans...').start();

    try {
      const inputText = inputCsvPath
        ? fs.readFileSync(inputCsvPath, 'utf8')
        : fs.readFileSync(0, 'utf8'); // stdin

      const parsedRows = parseCsv(inputText);
      if (parsedRows.length < 2) {
        spinner.fail('Input CSV has no data rows');
        throw new Error('Input CSV must include a header row and at least one data row');
      }

      const inputHeaders = parsedRows[0].map((h) => String(h ?? '').trim());
      const dataRows = parsedRows.slice(1);
      const limit = options.limit === undefined || options.limit === null || options.limit === ''
        ? null
        : Number.parseInt(String(options.limit), 10);

      if (limit !== null && (Number.isNaN(limit) || limit < 0)) {
        spinner.fail('Invalid limit');
        throw new Error('--limit must be a non-negative integer');
      }

      const rowsToProcess = limit === null ? dataRows : dataRows.slice(0, limit);

      const planIdIdx = findPlanIdColumnIndex(inputHeaders, options.planIdColumn);
      if (planIdIdx === -1) {
        spinner.fail('Could not find plan id column');
        throw new Error(
          `Could not find a plan id column in input CSV. ` +
          `Tried: billingPlanId, planId, id (also matches variants like "Plan Id"). ` +
          `Use --plan-id-column to specify the correct header.`
        );
      }

      const merchantIdIdx = findMerchantIdColumnIndex(inputHeaders, options.merchantIdColumn);
      if (merchantIdIdx === -1) {
        spinner.fail('Could not find merchant id column');
        throw new Error(
          `Could not find a merchant id column in input CSV. ` +
          `Tried: merchant_id, merchantId, merchId, mid, location (also matches variants like "Merchant Id"). ` +
          `Use --merchant-id-column to specify the correct header.`
        );
      }

      // Apply command-specific configuration
      const configToUse = applyCommandConfig(config, 'billingplan');
      const api = new CardPointeAPI(configToUse, options.verbose);
      await ensureAuthenticatedOrExit(api, spinner, config);

      const outputPath = options.output || null;

      const outputHeaders = [...inputHeaders];
      const outputRows = [];

      const knownColumns = new Set(outputHeaders.map(String));
      const profileCache = new Map();

      for (let rowIndex = 0; rowIndex < rowsToProcess.length; rowIndex++) {
        const row = rowsToProcess[rowIndex];
        const merchantId = String(row[merchantIdIdx] ?? '').trim();
        const billingPlanId = String(row[planIdIdx] ?? '').trim();

        spinner.text = `Exporting billing plans (${rowIndex + 1}/${rowsToProcess.length})...`;

        const baseRowObj = {};
        for (let i = 0; i < inputHeaders.length; i++) {
          baseRowObj[inputHeaders[i]] = row[i] ?? '';
        }

        let plan = null;
        if (merchantId && billingPlanId) {
          plan = await fetchBillingPlan(api, merchantId, billingPlanId);
        }

        const flattened = {};
        if (plan) {
          flattenForCsv(plan, 'billingPlan', flattened);
        } else {
          flattened['billingPlan'] = '';
        }

        // Fetch profile data (and cache) if billingPlan includes profile identifiers
        let profile = null;
        if (plan && plan.profileId) {
          const profileId = String(plan.profileId ?? '').trim();
          const accountId = String(plan.acctId ?? plan.accountId ?? '').trim();
          const merchIdForProfile = String(plan.merchId ?? merchantId).trim();
          const cacheKey = `${profileId}::${accountId}::${merchIdForProfile}`;

          if (profileCache.has(cacheKey)) {
            profile = profileCache.get(cacheKey);
          } else {
            try {
              profile = await fetchProfileData(configToUse, profileId, accountId, merchIdForProfile, options.verbose);
              profileCache.set(cacheKey, profile);
            } catch (e) {
              profile = null;
              profileCache.set(cacheKey, null);
              flattened['profileFetchError'] = e.message;
            }
          }
        }

        const flattenedProfile = {};
        if (profile) {
          flattenForCsv(profile, 'profile', flattenedProfile);
        } else {
          flattenedProfile.profile = '';
        }

        // Merge base + flattened into final row object
        const finalRowObj = { ...baseRowObj, ...flattened, ...flattenedProfile };

        // Add any new columns (stable order: first time seen)
        const newKeys = [...Object.keys(flattened), ...Object.keys(flattenedProfile)].sort();
        for (const key of newKeys) {
          if (!knownColumns.has(key)) {
            knownColumns.add(key);
            outputHeaders.push(key);
          }
        }

        const outRow = outputHeaders.map((h) => finalRowObj[h] ?? '');
        outputRows.push(outRow);
      }

      const csvOut = stringifyCsv([outputHeaders, ...outputRows]);
      if (outputPath) {
        fs.writeFileSync(outputPath, csvOut, 'utf8');
        spinner.succeed(`Exported ${outputRows.length} billing plan(s) to ${outputPath}`);
      } else {
        // Default behavior: write CSV to stdout (so callers can redirect/pipeline)
        spinner.succeed(`Exported ${outputRows.length} billing plan(s)`);
        process.stdout.write(csvOut);
      }
    } catch (error) {
      spinner.fail('Export failed');
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

function getPaymentStatusColor(status) {
  if (!status) return chalk.gray('Unknown');
  
  const statusLower = status.toLowerCase();
  if (statusLower.includes('paid') || statusLower.includes('success')) {
    return chalk.green(status);
  } else if (statusLower.includes('failed') || statusLower.includes('error') || statusLower.includes('cancelled')) {
    return chalk.red(status);
  } else if (statusLower.includes('pending') || statusLower.includes('scheduled') || statusLower.includes('processing')) {
    return chalk.yellow(status);
  } else {
    return chalk.blue(status);
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
