const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');

// Import the API client classes
const { CardPointeAPI, CardPointeGatewayAPI } = require('../../lib/api-client');

describe('CardPointe Authentication', () => {
  let mockAxios;
  let api;

  beforeEach(() => {
    mockAxios = new MockAdapter(axios);
    // Clear environment variables
    delete process.env.CARDCONNECT_TOKEN;
    delete process.env.CARDCONNECT_CLIENT_ID;
    delete process.env.CARDCONNECT_CLIENT_SECRET;
    delete process.env.CARDCONNECT_USERNAME;
    delete process.env.CARDCONNECT_PASSWORD;
    delete process.env.CARDCONNECT_SITE;
    delete process.env.CARDCONNECT_MERCHID;
  });

  afterEach(() => {
    mockAxios.restore();
  });

  describe('CoPilot API Username/Password Authentication', () => {
    const tokenEndpointTemplate = 'https://accounts.example.com/<sitename>/token';
    const tokenEndpointResolved = 'https://accounts.example.com/cardpointe-uat/token';

    const testConfig = {
      production: false,
      sitename: 'cardpointe-uat',
      username: 'test-user',
      password: 'test-password',
      client_id: 'test-client',
      client_secret: 'test-secret-123',
      apiVersion: '1.0',
      global: {
        uat: {
          copilot_api_url: 'https://api-uat.cardconnect.com',
          copilot_api_version: '1.0',
          token_endpoint: tokenEndpointTemplate
        }
      }
    };

    beforeEach(() => {
      api = new CardPointeAPI(testConfig);
    });

    test('should successfully get token using username/password grant', async () => {
      const mockTokenResponse = {
        access_token: 'mock-access-token-123',
        token_type: 'Bearer',
        expires_in: 3600
      };

      mockAxios.onPost(tokenEndpointResolved).reply(200, mockTokenResponse);

      const token = await api.getToken();
      expect(token).toBe('mock-access-token-123');

      expect(mockAxios.history.post).toHaveLength(1);
      const postData = mockAxios.history.post[0].data;
      expect(postData).toContain('grant_type=password');
      expect(postData).toContain('username=test-user');
      expect(postData).toContain('password=test-password');
    });

    test('should return cached token on subsequent calls', async () => {
      mockAxios.onPost(tokenEndpointResolved).reply(200, { access_token: 'mock-access-token-123' });

      const token1 = await api.getToken();
      const token2 = await api.getToken();

      expect(token1).toBe('mock-access-token-123');
      expect(token2).toBe('mock-access-token-123');
      expect(mockAxios.history.post).toHaveLength(1);
    });

    test('should handle token request errors', async () => {
      mockAxios.onPost(tokenEndpointResolved).reply(400, { message: 'Invalid credentials' });
      await expect(api.getToken()).rejects.toThrow('Failed to get CoPilot token: Invalid credentials');
    });

    test('should generate correct headers with token', async () => {
      mockAxios.onPost(tokenEndpointResolved).reply(200, { access_token: 'mock-access-token-123' });

      const headers = await api.getHeaders();
      expect(headers).toEqual({
        Authorization: 'Bearer mock-access-token-123',
        'X-CopilotAPI-Version': '1.0',
        'Content-Type': 'application/json',
        Accept: 'application/json'
      });
    });
  });

  describe('Direct Token Authentication', () => {
    const testConfig = {
      production: false,
      sitename: 'cardpointe-uat',
      apiVersion: '1.0',
      global: {
        uat: {
          copilot_api_url: 'https://api-uat.cardconnect.com',
          copilot_api_version: '1.0'
        }
      }
    };

    beforeEach(() => {
      api = new CardPointeAPI(testConfig);
    });

    test('should use direct token when CARDCONNECT_TOKEN is set', async () => {
      process.env.CARDCONNECT_TOKEN = 'direct-token-123';

      const token = await api.getToken();

      expect(token).toBe('direct-token-123');
      expect(mockAxios.history.post).toHaveLength(0); // No OAuth call
    });

    test('should prioritize direct token over OAuth credentials', async () => {
      process.env.CARDCONNECT_TOKEN = 'direct-token-123';
      api.config.client_id = 'test-client';
      api.config.client_secret = 'test-secret';

      const token = await api.getToken();

      expect(token).toBe('direct-token-123');
      expect(mockAxios.history.post).toHaveLength(0); // No OAuth call
    });
  });

  describe('API Request Authentication', () => {
    const testConfig = {
      production: false,
      sitename: 'cardpointe-uat',
      apiVersion: '1.0',
      global: {
        uat: {
          copilot_api_url: 'https://api-uat.cardconnect.com',
          copilot_api_version: '1.0'
        }
      }
    };

    beforeEach(() => {
      api = new CardPointeAPI(testConfig);
    });

    test('should include authentication in API requests', async () => {
      const mockBillingPlansResponse = {
        billingPlans: [
          {
            billingPlanId: '12345',
            billingPlanName: 'Test Plan',
            planStatus: 'A'
          }
        ]
      };

      process.env.CARDCONNECT_TOKEN = 'mock-access-token-123';

      mockAxios
        .onGet('https://api-uat.cardconnect.com/billingplan/list/123456789012')
        .reply(200, mockBillingPlansResponse);

      const result = await api.request('GET', '/billingplan/list/123456789012');

      expect(result).toEqual(mockBillingPlansResponse);
      
      // Verify the request was made with correct headers
      const request = mockAxios.history.get[0];
      expect(request.headers.Authorization).toBe('Bearer mock-access-token-123');
      expect(request.headers['X-CopilotAPI-Version']).toBe('1.0');
      expect(request.headers['Content-Type']).toBe('application/json');
    });

    test('should handle API request errors', async () => {
      process.env.CARDCONNECT_TOKEN = 'mock-access-token-123';

      mockAxios
        .onGet('https://api-uat.cardconnect.com/billingplan/list/123456789012')
        .reply(404, { error: 'Merchant not found' });

      await expect(api.request('GET', '/billingplan/list/123456789012'))
        .rejects.toThrow('API Error: 404 - {"error":"Merchant not found"}');
    });
  });

  describe('Authentication Error Handling', () => {
    test('should throw error when no authentication method is available', async () => {
      const testConfig = {
        production: false,
        sitename: 'cardpointe-uat',
        apiVersion: '1.0',
        global: {
          uat: {
            copilot_api_url: 'https://api-uat.cardconnect.com',
            copilot_api_version: '1.0'
          }
        }
      };

      api = new CardPointeAPI(testConfig);

      await expect(api.getToken()).rejects.toThrow(
        'No authentication method available. Set CARDCONNECT_TOKEN or configure username/password'
      );
    });

    test('should throw error when username/password is incomplete', async () => {
      const testConfig = {
        production: false,
        sitename: 'cardpointe-uat',
        username: 'test-user',
        // Missing password
        apiVersion: '1.0',
        global: {
          uat: {
            copilot_api_url: 'https://api-uat.cardconnect.com',
            copilot_api_version: '1.0'
          }
        }
      };

      api = new CardPointeAPI(testConfig);

      await expect(api.getToken()).rejects.toThrow(
        'No authentication method available. Set CARDCONNECT_TOKEN or configure username/password'
      );
    });
  });

  describe('CardPointe Gateway API Authentication', () => {
    let gatewayApi;

    beforeEach(() => {
      // Clear environment variables
      delete process.env.CARDCONNECT_MERCHID;
      delete process.env.CARDCONNECT_USERNAME;
      delete process.env.CARDCONNECT_PASSWORD;
      delete process.env.CARDCONNECT_SITE;
    });

    test('should get credentials from config', () => {
      const testConfig = {
        merchid: '123456789012',
        username: 'test-user',
        password: 'test-password',
        sitename: 'test-site',
        apiBaseUrl: 'https://api-uat.cardconnect.com'
      };

      gatewayApi = new CardPointeGatewayAPI(testConfig);
      const credentials = gatewayApi.getAuthCredentials();

      expect(credentials).toEqual({
        merchid: '123456789012',
        username: 'test-user',
        password: 'test-password',
        site: 'test-site'
      });
    });

    test('should prioritize environment variables over config', () => {
      const testConfig = {
        merchid: 'config-merchid',
        username: 'config-user',
        password: 'config-password',
        sitename: 'config-site',
        apiBaseUrl: 'https://api-uat.cardconnect.com'
      };

      process.env.CARDCONNECT_MERCHID = 'env-merchid';
      process.env.CARDCONNECT_USERNAME = 'env-user';
      process.env.CARDCONNECT_PASSWORD = 'env-password';
      process.env.CARDCONNECT_SITE = 'env-site';

      gatewayApi = new CardPointeGatewayAPI(testConfig);
      const credentials = gatewayApi.getAuthCredentials();

      expect(credentials).toEqual({
        merchid: 'env-merchid',
        username: 'env-user',
        password: 'env-password',
        site: 'env-site'
      });
    });

    test('should include credentials in API requests', async () => {
      const testConfig = {
        merchid: '123456789012',
        username: 'test-user',
        password: 'test-password',
        sitename: 'test-site',
        apiBaseUrl: 'https://api-uat.cardconnect.com'
      };

      const mockAuthResponse = {
        resptext: 'Approval',
        respcode: '00',
        retref: '123456789012'
      };

      mockAxios
        .onPost('https://api-uat.cardconnect.com/auth')
        .reply(200, mockAuthResponse);

      gatewayApi = new CardPointeGatewayAPI(testConfig);
      
      const result = await gatewayApi.request('POST', '/auth', {
        account: '4111111111111111',
        expiry: '1212',
        amount: '10.00'
      });

      expect(result).toEqual(mockAuthResponse);
      
      // Verify the request included authentication credentials
      const request = mockAxios.history.post[0];
      const requestData = JSON.parse(request.data);
      
      expect(requestData.merchid).toBe('123456789012');
      expect(requestData.username).toBe('test-user');
      expect(requestData.password).toBe('test-password');
      expect(requestData.site).toBe('test-site');
      expect(requestData.account).toBe('4111111111111111');
      expect(requestData.expiry).toBe('1212');
      expect(requestData.amount).toBe('10.00');
    });

    test('should handle Gateway API request errors', async () => {
      const testConfig = {
        merchid: '123456789012',
        username: 'test-user',
        password: 'test-password',
        sitename: 'test-site',
        apiBaseUrl: 'https://api-uat.cardconnect.com'
      };

      mockAxios
        .onPost('https://api-uat.cardconnect.com/auth')
        .reply(400, {
          resptext: 'Invalid merchant ID',
          respcode: '01'
        });

      gatewayApi = new CardPointeGatewayAPI(testConfig);

      await expect(gatewayApi.request('POST', '/auth', {}))
        .rejects.toThrow('API Error: 400 - {"resptext":"Invalid merchant ID","respcode":"01"}');
    });
  });
});
