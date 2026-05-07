const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const services = [
  'api-gateway',
  'billing-service',
  'booking-service',
  'facility-service',
  'iot-service',
  'member-service',
  'recommendation-service',
  'workout-progress-service'
];

console.log('| Service | Statements | Branches | Functions | Lines |');
console.log('|---------|------------|----------|-----------|-------|');

services.forEach(service => {
  const servicePath = path.join(process.cwd(), service);
  if (fs.existsSync(servicePath)) {
    try {
      // Run coverage if report doesn't exist or just run it to be sure
      // execSync('npm run test:cov', { cwd: servicePath, stdio: 'ignore' });
      
      const coverageSummaryPath = path.join(servicePath, 'coverage', 'coverage-summary.json');
      if (fs.existsSync(coverageSummaryPath)) {
        const summary = JSON.parse(fs.readFileSync(coverageSummaryPath, 'utf8'));
        const total = summary.total;
        console.log(`| ${service} | ${total.statements.pct}% | ${total.branches.pct}% | ${total.functions.pct}% | ${total.lines.pct}% |`);
      } else {
         // Run it if it doesn't exist
         execSync('npm run test:cov -- --coverageReporters="json-summary"', { cwd: servicePath, stdio: 'ignore' });
         const summary = JSON.parse(fs.readFileSync(coverageSummaryPath, 'utf8'));
         const total = summary.total;
         console.log(`| ${service} | ${total.statements.pct}% | ${total.branches.pct}% | ${total.functions.pct}% | ${total.lines.pct}% |`);
      }
    } catch (e) {
      console.log(`| ${service} | Error | Error | Error | Error |`);
    }
  }
});
