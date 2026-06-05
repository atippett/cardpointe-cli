const chalk = require('chalk');
const ora = require('ora');
const axios = require('axios');
const { getCardPointeRestBaseUrl } = require('./profile');

function getGatewayCredentials(config) {
  const username = process.env.CARDCONNECT_GATEWAY_USERNAME || config.cardpointe_username || config.username;
  const password = process.env.CARDCONNECT_GATEWAY_PASSWORD || config.cardpointe_password || config.password;
  return { username, password };
}

async function binLookup(bin, options, config) {
  const spinner = ora('Looking up BIN...').start();
  try {
    const base = getCardPointeRestBaseUrl(config);
    if (!base) {
      spinner.fail('No cardpointe_api_url configured (global.*.cardpointe_api_url)');
      throw new Error('Missing cardpointe_api_url in config');
    }

    const merchId = process.env.CARDCONNECT_MERCHID || config.merchid;
    if (!merchId) {
      spinner.fail('No merchid available');
      throw new Error('Configure merchid in ~/.fiserv-cli or config-local.yaml (or set CARDCONNECT_MERCHID)');
    }

    const { username, password } = getGatewayCredentials(config);
    if (!username || !password) {
      spinner.fail('No username/password available');
      throw new Error('Configure cardpointe.username/password (or username/password) in ~/.fiserv-cli or config-local.yaml');
    }

    const endpointPath = `bin/${encodeURIComponent(merchId)}/${encodeURIComponent(bin)}`;
    const url = `${base}${endpointPath}`;

    if (options.verbose) {
      spinner.info('BIN request:');
      console.error(chalk.gray('URL:'), url);
      console.error(chalk.gray('Method:'), 'GET');
    }

    const headers = {
      Accept: 'application/json',
      Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
    };

    const response = await axios.get(url, { headers });
    spinner.succeed('BIN retrieved');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (err) {
    spinner.fail('BIN lookup failed');
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

module.exports = { binLookup };
