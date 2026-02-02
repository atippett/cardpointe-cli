const chalk = require('chalk');
const ora = require('ora');
const axios = require('axios');

function getCardPointeRestBaseUrl(config) {
  const envKey = config.production ? 'production' : 'uat';
  const template = config?.global?.[envKey]?.cardpointe_api_url;
  if (!template) return null;

  const sitename = config.sitename || '';
  let url = String(template);
  if (sitename && url.includes('<site>')) {
    url = url.replace('<site>', sitename);
  }
  if (!url.endsWith('/')) url += '/';
  return url;
}

async function getProfile(profileId, accountId, merchantId, options, config) {
  const spinner = ora('Fetching profile...').start();
  try {
    const base = getCardPointeRestBaseUrl(config);
    if (!base) {
      spinner.fail('No cardpointe_api_url configured (global.*.cardpointe_api_url)');
      throw new Error('Missing cardpointe_api_url in config');
    }

    const username = process.env.CARDCONNECT_GATEWAY_USERNAME || config.cardpointe_username || config.username;
    const password = process.env.CARDCONNECT_GATEWAY_PASSWORD || config.cardpointe_password || config.password;
    if (!username || !password) {
      spinner.fail('No username/password available');
      throw new Error('Configure cardpointe.username/password (or username/password) in ~/.cardpointe-cli or config/local.yaml');
    }

    const endpointPath = `profile/${encodeURIComponent(profileId)}/${encodeURIComponent(accountId)}/${encodeURIComponent(merchantId)}`;
    const url = `${base}${endpointPath}`;

    if (options.verbose) {
      spinner.info('Profile request:');
      console.error(chalk.gray('URL:'), url);
      console.error(chalk.gray('Method:'), 'GET');
    }

    const headers = {
      Accept: 'application/json',
      Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
    };

    const response = await axios.get(url, { headers });
    spinner.succeed('Profile retrieved');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (err) {
    spinner.fail('Profile fetch failed');
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

module.exports = { getProfile };
