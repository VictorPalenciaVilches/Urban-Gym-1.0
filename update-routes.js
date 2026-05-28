const fs = require('fs');
const path = require('path');

const services = [
  'admin-bff',
  'api-gateway',
  'billing-service',
  'booking-service',
  'facility-service',
  'iot-service',
  'member-service',
  'recommendation-service',
  'workout-progress-service'
];

for (const service of services) {
  const controllerPath = path.join(__dirname, service, 'src', 'app.controller.ts');
  if (fs.existsSync(controllerPath)) {
    let content = fs.readFileSync(controllerPath, 'utf8');
    
    // Si ya tiene una ruta raíz, la saltamos
    if (content.includes('@Get()') && !content.includes('@Get(\'')) {
      // Check for exact @Get() without arguments
      const getRootRegex = /@Get\(\s*\)/g;
      if (getRootRegex.test(content)) continue;
    }

    const serviceNameFriendly = service.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    
    const rootRoute = `
  @Get()
  getRoot(): string {
    return 'Urban Gym ${serviceNameFriendly} is running!';
  }
`;

    content = content.replace('export class AppController {', 'export class AppController {' + rootRoute);
    fs.writeFileSync(controllerPath, content);
    console.log(`Updated ${service}`);
  }
}
