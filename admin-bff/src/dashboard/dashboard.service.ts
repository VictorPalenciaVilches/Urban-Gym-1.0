import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  private get(url: string, token: string) {
    return fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  }

  async getDashboard(token: string) {
    const memberUrl     = process.env.MEMBER_SERVICE_URL     ?? 'http://localhost:3001';
    const billingUrl    = process.env.BILLING_SERVICE_URL    ?? 'http://localhost:3006';
    const bookingUrl    = process.env.BOOKING_SERVICE_URL    ?? 'http://localhost:3002';
    const facilityUrl   = process.env.FACILITY_SERVICE_URL   ?? 'http://localhost:3003';

    // Llamadas en paralelo a todos los servicios
    const [members, revenue, recentBookings, gyms] = await Promise.all([
      this.get(`${memberUrl}/members`, token),
      this.get(`${billingUrl}/billing/admin/revenue`, token),
      this.get(`${bookingUrl}/bookings/admin/recent`, token),
      this.get(`${facilityUrl}/gyms`, token),
    ]);

    const memberList = Array.isArray(members) ? members : [];
    const gymList    = Array.isArray(gyms) ? gyms : [];

    return {
      kpis: {
        total_members:       memberList.length,
        active_members:      memberList.filter((m: any) => m.subscription_status === 'active').length,
        pending_members:     memberList.filter((m: any) => m.subscription_status === 'pending').length,
        total_revenue_cop:   revenue?.total_revenue_cop ?? 0,
        active_subscriptions: revenue?.active_subscriptions ?? 0,
        subscriptions_by_plan: revenue?.by_plan ?? {},
        total_gyms:          gymList.length,
      },
      recent_bookings: recentBookings ?? [],
      members: memberList.slice(0, 20),
      generated_at: new Date().toISOString(),
    };
  }

  async getMembers(token: string) {
    const memberUrl = process.env.MEMBER_SERVICE_URL ?? 'http://localhost:3001';
    return this.get(`${memberUrl}/members`, token);
  }

  async getRevenue(token: string) {
    const billingUrl = process.env.BILLING_SERVICE_URL ?? 'http://localhost:3006';
    const [revenue, payments] = await Promise.all([
      this.get(`${billingUrl}/billing/admin/revenue`, token),
      this.get(`${billingUrl}/billing/admin/payments`, token),
    ]);
    return { revenue, payments };
  }

  async getBookings(token: string) {
    const bookingUrl = process.env.BOOKING_SERVICE_URL ?? 'http://localhost:3002';
    return this.get(`${bookingUrl}/schedules`, token);
  }
}
