const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');
const { testCardPointeCredentials, getCardPointeRestBaseUrl } = require('../../commands/profile');

describe('auth.cardpointe', () => {
  let mockAxios;

  const baseUrl = 'https://daysmart-uat.cardconnect.com/cardconnect/rest/';
  const testConfig = {
    production: false,
    sitename: 'daysmart',
    cardpointe_username: 'test-gateway-user',
    cardpointe_password: 'test-gateway-pass',
    global: {
      uat: {
        cardpointe_api_url: 'https://<site>-uat.cardconnect.com/cardconnect/rest/'
      }
    }
  };

  beforeEach(() => {
    mockAxios = new MockAdapter(axios);
    delete process.env.CARDCONNECT_GATEWAY_USERNAME;
    delete process.env.CARDCONNECT_GATEWAY_PASSWORD;
  });

  afterEach(() => {
    mockAxios.restore();
  });

  test('builds correct base URL from config', () => {
    const url = getCardPointeRestBaseUrl(testConfig);
    expect(url).toBe(baseUrl);
  });

  test('sends PUT with Basic Auth to test credentials', async () => {
    mockAxios.onPut(baseUrl).reply((config) => {
      const body = JSON.parse(config.data || '{}');
      return body.merchid ? [200, 'CardConnect REST Servlet'] : [400, 'Bad request'];
    });

    const response = await testCardPointeCredentials(testConfig);
    expect(response.status).toBe(200);

    expect(mockAxios.history.put).toHaveLength(1);
    const req = mockAxios.history.put[0];
    expect(req.headers.Authorization).toMatch(/^Basic /);
    const decoded = Buffer.from(req.headers.Authorization.replace('Basic ', ''), 'base64').toString();
    expect(decoded).toBe('test-gateway-user:test-gateway-pass');
    expect(JSON.parse(req.data)).toEqual({ merchid: '496082673888' });
  });

  test('uses custom merchid when provided', async () => {
    mockAxios.onPut(baseUrl).reply(200, 'OK');

    await testCardPointeCredentials(testConfig, '123456789012');
    expect(mockAxios.history.put[0].data).toContain('123456789012');
  });

  test('falls back to username/password when cardpointe_* not set', async () => {
    const legacyConfig = {
      ...testConfig,
      cardpointe_username: undefined,
      cardpointe_password: undefined,
      username: 'legacy-user',
      password: 'legacy-pass'
    };
    mockAxios.onPut(baseUrl).reply(200, 'OK');

    await testCardPointeCredentials(legacyConfig);
    const decoded = Buffer.from(
      mockAxios.history.put[0].headers.Authorization.replace('Basic ', ''),
      'base64'
    ).toString();
    expect(decoded).toBe('legacy-user:legacy-pass');
  });

  test('throws when credentials missing', async () => {
    const noCreds = { ...testConfig, cardpointe_username: undefined, cardpointe_password: undefined, username: undefined, password: undefined };
    await expect(testCardPointeCredentials(noCreds)).rejects.toThrow(/Configure cardpointe/);
    expect(mockAxios.history.put).toHaveLength(0);
  });

  test('throws when cardpointe_api_url not configured', async () => {
    const noUrl = { ...testConfig, global: {} };
    await expect(testCardPointeCredentials(noUrl)).rejects.toThrow(/cardpointe_api_url/);
  });
});
