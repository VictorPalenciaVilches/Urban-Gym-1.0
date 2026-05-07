import { Controller, Get, Post, Body, Param, Headers } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';

export class SaveMetricsDto {
  weight_kg: number;
  height_cm: number;
  goal: string;
}

@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Get(':memberId/classes')
  async getRecommendedClasses(
    @Param('memberId') memberId: string,
    @Headers('authorization') authHeader: string
  ) {
    return this.recommendationsService.getRecommendedClasses(memberId, authHeader);
  }

  @Post(':memberId/metrics')
  async saveMetrics(
    @Param('memberId') memberId: string,
    @Body() dto: SaveMetricsDto
  ) {
    return this.recommendationsService.saveMetrics(memberId, dto);
  }

  @Get(':memberId/plan')
  async getFitnessPlan(@Param('memberId') memberId: string) {
    return this.recommendationsService.getFitnessPlan(memberId);
  }
}
