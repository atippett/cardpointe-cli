const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');
const { CardPointeAPI } = require('../../lib/api-client');

describe('auth.copilot', () => {
  let mockAxios;
  let api;

  const tokenEndpointUat = 'https://accountsuat.cardconnect.com/auth/realms/cardconnect/protocol/openid-connect/token';
  const testConfig = {
    production: false,
    sitename: 'daysmart-uat',
    username: 'test-user',
    password: 'test-password',
    client_id: 'test-client',
    client_secret: 'test-secret-123',
    apiVersion: '1.0',
    global: {
      uat: {
        copilot_api_url: 'https://api-uat.cardconnect.com',
        copilot_api_version: '1.0',
        token_endpoint: tokenEndpointUat
      }
    }
  };

  beforeEach(() => {
    mockAxios = new MockAdapter(axios);
    delete process.env.CARDCONNECT_TOKEN;
    delete process.env.CARDCONNECT_USERNAME;
    delete process.env.CARDCONNECT_PASSWORD;
    api = new CardPointeAPI(testConfig);
  });

  afterEach(() => {
    mockAxios.restore();
  });

  test('obtains CoPilot token via username/password', async () => {
    mockAxios.onPost(tokenEndpointUat).reply(200, {
      access_token: 'mock-copilot-token',
      token_type: 'Bearer',
      expires_in: 3600
    });

    const token = await api.getToken();
    expect(token).toBe('mock-copilot-token');

    expect(mockAxios.history.post).toHaveLength(1);
    const data = mockAxios.history.post[0].data;
    expect(data).toContain('grant_type=password');
    expect(data).toContain('username=test-user');
    expect(data).toContain('password=test-password');
    expect(data).toContain('client_id=test-client');
    expect(data).toContain('client_secret=test-secret-123');
  });

  test('includes Bearer token and CoPilot headers in requests', async () => {
    mockAxios.onPost(tokenEndpointUat).reply(200, { access_token: 'bearer-token-123' });
    mockAxios.onGet('https://api-uat.cardconnect.com/billingplan/123/456').reply(200, {});

    const headers = await api.getHeaders();
    expect(headers.Authorization).toBe('Bearer bearer-token-123');
    expect(headers['X-CopilotAPI-Version']).toBe('1.0');
    expect(headers['Content-Type']).toBe('application/json');
  });

  test('throws when token request fails', async () => {
    mockAxios.onPost(tokenEndpointUat).reply(401, { error: 'invalid_grant' });
    await expect(api.getToken()).rejects.toThrow(/Failed to get CoPilot token/);
  });
});
