const axios = require('axios');
const chalk = require('chalk');

// API Client for CardPointe
class CardPointeAPI {
  constructor(config, verbose = false) {
    // Determine base URL based on production flag
    this.baseURL = this.getApiBaseUrl(config);
    this.apiVersion = config.apiVersion || '1.0.0';
    this.config = config;
    this.verbose = verbose;
    this.token = null;
  }

  getApiBaseUrl(config) {
    
    // Use production flag to determine environment
    if (config.production === true) {
      // Use production URL from global config, replace <sitename> placeholder
      if (config.global && config.global.production && config.global.production.copilot_api_url) {
        return config.global.production.copilot_api_url.replace('<sitename>', config.sitename);
      }
      return 'https://api.cardconnect.com';
    } else if (config.production === false) {
      // Use UAT URL from global config, replace <sitename> placeholder
      if (config.global && config.global.uat && config.global.uat.copilot_api_url) {
        return config.global.uat.copilot_api_url.replace('<sitename>', config.sitename);
      }
      return 'https://api-uat.cardconnect.com';
    }
    
    // Fallback to config value or default to UAT
    return config.apiBaseUrl || 'https://api-uat.cardconnect.com';
  }

  async getToken() {
    if (this.token) {
      return this.token;
    }

    // Check for direct token first
    if (process.env.CARDCONNECT_TOKEN) {
      this.token = process.env.CARDCONNECT_TOKEN;
      return this.token;
    }

    // Generate token using CoPilot username/password authentication
    if (this.config.username && this.config.password) {
      try {
        // Use token endpoint from config or default to CoPilot API
        let tokenEndpoint;
        if (this.config.production === true && this.config.global && this.config.global.production && this.config.global.production.token_endpoint) {
          tokenEndpoint = this.config.global.production.token_endpoint.replace('<sitename>', this.config.sitename);
        } else if (this.config.production === false && this.config.global && this.config.global.uat && this.config.global.uat.token_endpoint) {
          tokenEndpoint = this.config.global.uat.token_endpoint.replace('<sitename>', this.config.sitename);
        } else {
          // Default to CoPilot API token endpoint
          tokenEndpoint = `${this.baseURL}/token`;
        }
        
        const requestData = new URLSearchParams({
          username: this.config.username,
          password: this.config.password,
          grant_type: 'password',
          client_id: this.config.client_id,
          client_secret: this.config.client_secret
        });
        
        // Debug: Show the curl command being used (only if verbose)
        if (this.verbose) {
          console.error(chalk.gray('\nDebug - CoPilot Token Request:'));
          console.error(chalk.gray('URL:'), tokenEndpoint);
          console.error(chalk.gray('Method:'), 'POST');
          console.error(chalk.gray('Headers:'), JSON.stringify({
            'Content-Type': 'application/x-www-form-urlencoded'
          }, null, 2));
          console.error(chalk.gray('Data:'), requestData.toString());
        }
        
        const response = await axios({
          method: 'POST',
          url: tokenEndpoint,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          data: requestData
        });
        
        // CoPilot API returns access token in 'access_token' field
        this.token = response.data.access_token;
        return this.token;
      } catch (error) {
        throw new Error(`Failed to get CoPilot token: ${error.response?.data?.error || error.response?.data?.message || error.message}`);
      }
    }

    throw new Error('No authentication method available. Set CARDCONNECT_TOKEN or configure username/password');
  }

  async getHeaders() {
    const token = await this.getToken();
    // Use copilot_api_version from global config if available, otherwise fall back to apiVersion
    const apiVersion = String(this.config.global?.production?.copilot_api_version || 
                      this.config.global?.uat?.copilot_api_version || 
                      this.apiVersion);
    return {
      'Authorization': `Bearer ${token}`,
      'X-CopilotAPI-Version': apiVersion,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  async request(method, endpoint, data = null) {
    try {
      const headers = await this.getHeaders();
      const url = `${this.baseURL}${endpoint}`;
      
      // Debug: Show the exact request being made (only if verbose)
      if (this.verbose) {
        console.error(chalk.gray('\nDebug - API Request:'));
        console.error(chalk.gray('URL:'), url);
        console.error(chalk.gray('Method:'), method);
        console.error(chalk.gray('Headers:'), JSON.stringify(headers, null, 2));
        if (data) {
          console.error(chalk.gray('Data:'), JSON.stringify(data, null, 2));
        }
      }
      
      const response = await axios({
        method,
        url,
        headers,
        data
      });
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        throw new Error('Network Error: Unable to reach CardPointe API');
      } else {
        throw new Error(`Request Error: ${error.message}`);
      }
    }
  }
}

// CardPointe Gateway API Client (for transactions)
class CardPointeGatewayAPI {
  constructor(config) {
    this.baseURL = config.apiBaseUrl || 'https://api-uat.cardconnect.com';
    this.config = config;
  }

  getAuthCredentials() {
    return {
      merchid: process.env.CARDCONNECT_MERCHID || this.config.merchid,
      username: process.env.CARDCONNECT_USERNAME || this.config.username,
      password: process.env.CARDCONNECT_PASSWORD || this.config.password,
      site: process.env.CARDCONNECT_SITE || this.config.sitename
    };
  }

  async request(method, endpoint, data = {}) {
    try {
      const authCredentials = this.getAuthCredentials();
      const requestData = {
        ...authCredentials,
        ...data
      };

      const response = await axios({
        method,
        url: `${this.baseURL}${endpoint}`,
        headers: {
          'Content-Type': 'application/json'
        },
        data: requestData
      });
      
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        throw new Error('Network Error: Unable to reach CardPointe Gateway API');
      } else {
        throw new Error(`Request Error: ${error.message}`);
      }
    }
  }
}

module.exports = {
  CardPointeAPI,
  CardPointeGatewayAPI
};
