import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getRoot(): string {
    return 'Urban Gym Api Gateway is running!';
  }

  @Get('hello')
  getHello(): string {
    return 'Hello World!';
  }

  @Get('health')
  health() {
    return {
      status: 'ok',
      gateway: 'API Gateway - UrbanGym',
      timestamp: new Date().toISOString(),
      services: {
        memberService: process.env.MEMBER_SERVICE_URL || 'http://localhost:3001',
        bookingService: process.env.BOOKING_SERVICE_URL || 'http://localhost:3002',
        facilityService: process.env.FACILITY_SERVICE_URL || 'http://localhost:3003',
        iotService: process.env.IOT_SERVICE_URL || 'http://localhost:3004',
        progressService: process.env.PROGRESS_SERVICE_URL || 'http://localhost:3005',
        billingService: process.env.BILLING_SERVICE_URL || 'http://localhost:3006',
        recommendationService: process.env.RECOMMENDATION_SERVICE_URL || 'http://localhost:3007',
        adminBff: process.env.ADMIN_BFF_URL || 'http://localhost:3008',
      },
      routes: {
        '/auth/*': 'member-service',
        '/members/*': 'member-service',
        '/classes': 'booking-service',
        '/schedules': 'booking-service',
        '/bookings/*': 'booking-service',
        '/waitlist/*': 'booking-service',
        '/gyms/*': 'facility-service',
        '/equipment/*': 'facility-service',
        '/machines/*': 'iot-service',
        '/workouts/*': 'iot-service',
        '/progress/*': 'workout-progress-service',
        '/billing/*': 'billing-service',
        '/recommendations/*': 'recommendation-service',
        '/admin/*': 'admin-bff',
      },
    };
  }
}
