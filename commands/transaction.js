const chalk = require('chalk');
const ora = require('ora');
const axios = require('axios');
const { getCardPointeRestBaseUrl } = require('./profile');

// Resolve gateway Basic-auth credentials the same way profile.get does.
function getGatewayCredentials(config) {
  const username = process.env.CARDCONNECT_GATEWAY_USERNAME || config.cardpointe_username || config.username;
  const password = process.env.CARDCONNECT_GATEWAY_PASSWORD || config.cardpointe_password || config.password;
  return { username, password };
}

function resolveMerchId(config) {
  return process.env.CARDCONNECT_MERCHID || config.merchid;
}

// Shared read-only GET against the CardPointe Gateway REST API.
async function gatewayGet(spinner, endpointPath, options, config) {
  const base = getCardPointeRestBaseUrl(config);
  if (!base) {
    spinner.fail('No cardpointe_api_url configured (global.*.cardpointe_api_url)');
    throw new Error('Missing cardpointe_api_url in config');
  }

  const { username, password } = getGatewayCredentials(config);
  if (!username || !password) {
    spinner.fail('No username/password available');
    throw new Error('Configure cardpointe.username/password (or username/password) in ~/.fiserv-cli or config-local.yaml');
  }

  const url = `${base}${endpointPath}`;

  if (options.verbose) {
    spinner.info('Gateway request:');
    console.error(chalk.gray('URL:'), url);
    console.error(chalk.gray('Method:'), 'GET');
  }

  const headers = {
    Accept: 'application/json',
    Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
  };

  const response = await axios.get(url, { headers });
  return response.data;
}

async function inquireTransaction(retref, options, config) {
  const spinner = ora('Fetching transaction...').start();
  try {
    const merchId = resolveMerchId(config);
    if (!merchId) {
      spinner.fail('No merchid available');
      throw new Error('Configure merchid in ~/.fiserv-cli or config-local.yaml (or set CARDCONNECT_MERCHID)');
    }

    const endpointPath = `inquire/${encodeURIComponent(retref)}/${encodeURIComponent(merchId)}`;
    const data = await gatewayGet(spinner, endpointPath, options, config);
    spinner.succeed('Transaction retrieved');
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    spinner.fail('Transaction inquiry failed');
    const msg = err.response?.data?.message || err.response?.statusText || err.message;
    console.error(chalk.red('Error:'), msg);
    if (options.verbose && err.response) {
      console.error(chalk.gray('Status:'), err.response.status);
      if (err.response.data) {
        console.error(chalk.gray('Response:'), JSON.stringify(err.response.data, null, 2));
      }
    }
    throw err;
  }
}

async function settlementStatus(options, config) {
  const spinner = ora('Fetching settlement status...').start();
  try {
    const merchId = resolveMerchId(config);
    if (!merchId) {
      spinner.fail('No merchid available');
      throw new Error('Configure merchid in ~/.fiserv-cli or config-local.yaml (or set CARDCONNECT_MERCHID)');
    }

    const params = new URLSearchParams({ merchid: merchId });
    if (options.date) {
      params.set('date', options.date);
    }
    const endpointPath = `settlestat?${params.toString()}`;
    const data = await gatewayGet(spinner, endpointPath, options, config);
    spinner.succeed('Settlement status retrieved');
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    spinner.fail('Settlement status fetch failed');
    const msg = err.response?.data?.message || err.response?.statusText || err.message;
    console.error(chalk.red('Error:'), msg);
    if (options.verbose && err.response) {
      console.error(chalk.gray('Status:'), err.response.status);
      if (err.response.data) {
        console.error(chalk.gray('Response:'), JSON.stringify(err.response.data, null, 2));
      }
    }
    throw err;
  }
}

module.exports = { inquireTransaction, settlementStatus };
