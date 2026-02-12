const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Mock fs and path for testing
jest.mock('fs');
jest.mock('path');

describe('Configuration Loading', () => {
  const mockConfigPath = '/mock/config/path/.fiserv-cli';
  const mockConfigContent = `profilename: "test"
sitename: "test-site"
username: "test-user"
password: "test-password"
client_id: test-client
client_secret: test-secret-123
apiBaseUrl: "https://api-uat.cardconnect.com"
apiVersion: "1.0"`;

  beforeEach(() => {
    // Clear environment variables
    delete process.env.CARDCONNECT_CLIENT_ID;
    delete process.env.CARDCONNECT_CLIENT_SECRET;
    delete process.env.CARDCONNECT_USERNAME;
    delete process.env.CARDCONNECT_PASSWORD;
    delete process.env.CARDCONNECT_SITE;

    // Reset mocks
    jest.clearAllMocks();
    
    // Mock path.join to return our test config path
    path.join.mockImplementation((...args) => {
      if (args.includes('.fiserv-cli') || args.includes('.cardpointe-cli')) {
        return mockConfigPath;
      }
      return args.join('/');
    });
  });

  describe('loadConfig function', () => {
    let loadConfig;

    beforeEach(() => {
      // Mock the loadConfig function from the CLI
      loadConfig = () => {
        try {
          if (fs.existsSync(mockConfigPath)) {
            const fileContents = fs.readFileSync(mockConfigPath, 'utf8');
            const config = yaml.load(fileContents);
            
            // Set up environment variables from config if not already set
            if (config.client_id && !process.env.CARDCONNECT_CLIENT_ID) {
              process.env.CARDCONNECT_CLIENT_ID = config.client_id;
            }
            if (config.client_secret && !process.env.CARDCONNECT_CLIENT_SECRET) {
              process.env.CARDCONNECT_CLIENT_SECRET = config.client_secret;
            }
            if (config.username && !process.env.CARDCONNECT_USERNAME) {
              process.env.CARDCONNECT_USERNAME = config.username;
            }
            if (config.password && !process.env.CARDCONNECT_PASSWORD) {
              process.env.CARDCONNECT_PASSWORD = config.password;
            }
            if (config.sitename && !process.env.CARDCONNECT_SITE) {
              process.env.CARDCONNECT_SITE = config.sitename;
            }
            
            return config;
          }
        } catch (error) {
          throw new Error(`Error loading configuration: ${error.message}`);
        }
        return {};
      };
    });

    test('should load configuration from .profile file', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(mockConfigContent);

      const config = loadConfig();

      expect(config).toEqual({
        profilename: 'test',
        sitename: 'test-site',
        username: 'test-user',
        password: 'test-password',
        client_id: 'test-client',
        client_secret: 'test-secret-123',
        apiBaseUrl: 'https://api-uat.cardconnect.com',
        apiVersion: '1.0'
      });
    });

    test('should set environment variables from config', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(mockConfigContent);

      loadConfig();

      expect(process.env.CARDCONNECT_CLIENT_ID).toBe('test-client');
      expect(process.env.CARDCONNECT_CLIENT_SECRET).toBe('test-secret-123');
      expect(process.env.CARDCONNECT_USERNAME).toBe('test-user');
      expect(process.env.CARDCONNECT_PASSWORD).toBe('test-password');
      expect(process.env.CARDCONNECT_SITE).toBe('test-site');
    });

    test('should not override existing environment variables', () => {
      // Set existing environment variables
      process.env.CARDCONNECT_CLIENT_ID = 'existing-client';
      process.env.CARDCONNECT_USERNAME = 'existing-user';

      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(mockConfigContent);

      loadConfig();

      // Should keep existing values
      expect(process.env.CARDCONNECT_CLIENT_ID).toBe('existing-client');
      expect(process.env.CARDCONNECT_USERNAME).toBe('existing-user');
      
      // Should set new values from config
      expect(process.env.CARDCONNECT_CLIENT_SECRET).toBe('test-secret-123');
      expect(process.env.CARDCONNECT_PASSWORD).toBe('test-password');
      expect(process.env.CARDCONNECT_SITE).toBe('test-site');
    });

    test('should return empty object when config file does not exist', () => {
      fs.existsSync.mockReturnValue(false);

      const config = loadConfig();

      expect(config).toEqual({});
      expect(fs.readFileSync).not.toHaveBeenCalled();
    });

    test('should handle YAML parsing errors', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('invalid: yaml: content: [');

      expect(() => loadConfig()).toThrow('Error loading configuration:');
    });

    test('should handle file reading errors', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      expect(() => loadConfig()).toThrow('Error loading configuration: Permission denied');
    });
  });

  describe('YAML Configuration Format', () => {
    test('should parse YAML with space indentation correctly', () => {
      const yamlWithSpaces = `profilename: "test"
sitename: "test-site"
username: "test-user"`;

      const parsed = yaml.load(yamlWithSpaces);
      
      expect(parsed).toEqual({
        profilename: 'test',
        sitename: 'test-site',
        username: 'test-user'
      });
    });

    test('should handle nested YAML structure', () => {
      const nestedYaml = `profilename: "test"
sitename: "test-site"
config:
  username: "test-user"
  enabled: true`;

      const parsed = yaml.load(nestedYaml);
      
      expect(parsed).toEqual({
        profilename: 'test',
        sitename: 'test-site',
        config: {
          username: 'test-user',
          enabled: true
        }
      });
    });

    test('should handle boolean and numeric values', () => {
      const complexYaml = `profilename: "test"
sitename: "test-site"
enabled: true
timeout: 30
amount: 19.99`;

      const parsed = yaml.load(complexYaml);
      
      expect(parsed).toEqual({
        profilename: 'test',
        sitename: 'test-site',
        enabled: true,
        timeout: 30,
        amount: 19.99
      });
    });
  });
});
