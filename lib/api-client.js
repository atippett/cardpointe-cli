const axios = require('axios');

// API Client for CardPointe
class CardPointeAPI {
  constructor(config) {
    this.baseURL = config.apiBaseUrl || 'https://api-uat.cardconnect.com';
    this.apiVersion = config.apiVersion || '1.0';
    this.config = config;
    this.token = null;
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

    // Generate token using OAuth credentials
    if (this.config.client_id && this.config.client_secret) {
      try {
        const response = await axios({
          method: 'POST',
          url: `${this.baseURL}/oauth/token`,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          data: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: this.config.client_id,
            client_secret: this.config.client_secret
          })
        });
        
        this.token = response.data.access_token;
        return this.token;
      } catch (error) {
        throw new Error(`Failed to get OAuth token: ${error.response?.data?.error_description || error.message}`);
      }
    }

    throw new Error('No authentication method available. Set CARDCONNECT_TOKEN or configure client_id/client_secret');
  }

  async getHeaders() {
    const token = await this.getToken();
    return {
      'Authorization': `Bearer ${token}`,
      'X-CopilotAPI-Version': this.apiVersion,
      'Content-Type': 'application/json'
    };
  }

  async request(method, endpoint, data = null) {
    try {
      const headers = await this.getHeaders();
      const response = await axios({
        method,
        url: `${this.baseURL}${endpoint}`,
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
