const chalk = require('chalk');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const TESTS_DIR = path.join(__dirname, '../tests/unit');

/**
 * Known unit test names (without .test.js).
 * Add entries here when adding new test files.
 */
const UNIT_TESTS = [
  'auth.copilot',
  'authentication',
  'config'
];

function listTests() {
  return UNIT_TESTS;
}

function getTestPath(testName) {
  const base = testName.replace(/\./g, '.');
  const file = `${base}.test.js`;
  return path.join(TESTS_DIR, file);
}

async function runTest(testName) {
  const testPath = getTestPath(testName);
  if (!fs.existsSync(testPath)) {
    console.error(chalk.red(`Error: Test file not found: ${testPath}`));
    process.exit(1);
  }
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['jest', testPath, '--no-cache'], {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Tests exited with code ${code}`));
    });
    child.on('error', reject);
  });
}

async function runTests(options, config) {
  const testName = options.args?.[0];
  if (!testName) {
    console.log(chalk.cyan('Unit tests:'));
    listTests().forEach((name) => {
      console.log(chalk.gray('  ') + name);
    });
    console.log(chalk.gray('\nRun a test: cardpointe-cli test <name>'));
    console.log(chalk.gray('Example: cardpointe-cli test auth.copilot'));
    return;
  }
  try {
    await runTest(testName);
  } catch (err) {
    console.error(chalk.red('Error:'), err.message);
    process.exit(1);
  }
}

module.exports = { listTests, runTest, runTests };
