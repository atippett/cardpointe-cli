const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');
const { inquireTransaction, settlementStatus } = require('../../commands/transaction');

describe('transaction commands', () => {
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

  describe('inquireTransaction', () => {
    test('GETs /inquire/{retref}/{merchid} with Basic Auth', async () => {
      const url = `${baseUrl}inquire/123456789012/496082673888`;
      mockAxios.onGet(url).reply(200, { retref: '123456789012', respstat: 'A' });

      await inquireTransaction('123456789012', {}, testConfig);

      expect(mockAxios.history.get).toHaveLength(1);
      const req = mockAxios.history.get[0];
      expect(req.url).toBe(url);
      const decoded = Buffer.from(req.headers.Authorization.replace('Basic ', ''), 'base64').toString();
      expect(decoded).toBe('test-gateway-user:test-gateway-pass');
    });

    test('throws when merchid missing', async () => {
      const noMerch = { ...testConfig, merchid: undefined };
      await expect(inquireTransaction('123', {}, noMerch)).rejects.toThrow(/merchid/);
      expect(mockAxios.history.get).toHaveLength(0);
    });

    test('throws when cardpointe_api_url not configured', async () => {
      const noUrl = { ...testConfig, global: {} };
      await expect(inquireTransaction('123', {}, noUrl)).rejects.toThrow(/cardpointe_api_url/);
    });
  });

  describe('settlementStatus', () => {
    test('GETs /settlestat with merchid only when no date', async () => {
      const url = `${baseUrl}settlestat?merchid=496082673888`;
      mockAxios.onGet(url).reply(200, []);

      await settlementStatus({}, testConfig);

      expect(mockAxios.history.get).toHaveLength(1);
      expect(mockAxios.history.get[0].url).toBe(url);
    });

    test('includes date param when provided', async () => {
      const url = `${baseUrl}settlestat?merchid=496082673888&date=0102`;
      mockAxios.onGet(url).reply(200, []);

      await settlementStatus({ date: '0102' }, testConfig);

      expect(mockAxios.history.get).toHaveLength(1);
      expect(mockAxios.history.get[0].url).toBe(url);
    });

    test('throws when merchid missing', async () => {
      const noMerch = { ...testConfig, merchid: undefined };
      await expect(settlementStatus({}, noMerch)).rejects.toThrow(/merchid/);
      expect(mockAxios.history.get).toHaveLength(0);
    });
  });
});
