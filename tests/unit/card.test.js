const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');
const { binLookup } = require('../../commands/card');

describe('card.bin', () => {
  let mockAxios;
  let logSpy;

  const baseUrl = 'https://daysmart-uat.cardconnect.com/cardconnect/rest/';
  const testConfig = {
    production: false,
    sitename: 'daysmart',
    merchid: '496082673888',
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
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    delete process.env.CARDCONNECT_GATEWAY_USERNAME;
    delete process.env.CARDCONNECT_GATEWAY_PASSWORD;
    delete process.env.CARDCONNECT_MERCHID;
  });

  afterEach(() => {
    mockAxios.restore();
    logSpy.mockRestore();
  });

  test('GETs /bin/{merchid}/{bin} with Basic Auth', async () => {
    const url = `${baseUrl}bin/496082673888/411111`;
    mockAxios.onGet(url).reply(200, { bin: '411111', country: 'USA' });

    await binLookup('411111', {}, testConfig);

    expect(mockAxios.history.get).toHaveLength(1);
    const req = mockAxios.history.get[0];
    expect(req.url).toBe(url);
    const decoded = Buffer.from(req.headers.Authorization.replace('Basic ', ''), 'base64').toString();
    expect(decoded).toBe('test-gateway-user:test-gateway-pass');
  });

  test('throws when merchid missing', async () => {
    const noMerch = { ...testConfig, merchid: undefined };
    await expect(binLookup('411111', {}, noMerch)).rejects.toThrow(/merchid/);
    expect(mockAxios.history.get).toHaveLength(0);
  });

  test('throws when cardpointe_api_url not configured', async () => {
    const noUrl = { ...testConfig, global: {} };
    await expect(binLookup('411111', {}, noUrl)).rejects.toThrow(/cardpointe_api_url/);
  });

  test('falls back to username/password when cardpointe_* not set', async () => {
    const legacyConfig = {
      ...testConfig,
      cardpointe_username: undefined,
      cardpointe_password: undefined,
      username: 'legacy-user',
      password: 'legacy-pass'
    };
    const url = `${baseUrl}bin/496082673888/411111`;
    mockAxios.onGet(url).reply(200, {});

    await binLookup('411111', {}, legacyConfig);
    const decoded = Buffer.from(
      mockAxios.history.get[0].headers.Authorization.replace('Basic ', ''),
      'base64'
    ).toString();
    expect(decoded).toBe('legacy-user:legacy-pass');
  });
});
