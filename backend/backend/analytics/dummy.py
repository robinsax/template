import random
from datetime import datetime, timedelta

from backend.model import CampaignChannel

from .base import AnalyticsBackend, DailyMetricsModel, RawAnalyticsModel

class DummyAnalyticsBackend(AnalyticsBackend):
    def get_channel_metrics( # pylint: disable=too-many-locals, too-many-statements
        self, channel: CampaignChannel, ids: list[str]
    ) -> list[DailyMetricsModel]:
        """
        Generate realistic dummy analytics data for testing.

        Creates sample data with:
        - Learning phase (first 3-5 days with poor performance)
        - Gradual optimization trends
        - Day-of-week patterns (weekends different from weekdays)
        - Random variance and occasional anomalies
        - Realistic metric relationships (CTR, CPC, CPA correlations)
        - Channel-specific performance characteristics
        """
        metrics = []

        brief = channel.campaign.brief
        if brief and brief.start_date and brief.end_date:
            start_date = brief.start_date
            end_date = brief.end_date
            total_days = (end_date - start_date).days + 1
        else:
            start_date = datetime.now() - timedelta(days=30)
            total_days = 30

        daily_budget = (brief.budget * channel.budget_allocation) / total_days

        # === CHANNEL-SPECIFIC CHARACTERISTICS ===
        # Use channel ID as seed for consistent but different performance per channel
        channel_seed = hash(str(channel.id)) % 10000
        random.seed(channel_seed)

        # Each channel has different baseline performance
        channel_performance_tier = random.choice(["high", "medium", "low"])

        if channel_performance_tier == "high":
            base_ctr = random.uniform(0.020, 0.030)  # 2-3% CTR
            base_cpc = random.uniform(0.60, 0.90)    # $0.60-0.90 CPC
            base_cvr = random.uniform(0.10, 0.15)    # 10-15% CVR
        elif channel_performance_tier == "medium":
            base_ctr = random.uniform(0.012, 0.020)  # 1.2-2% CTR
            base_cpc = random.uniform(0.80, 1.20)    # $0.80-1.20 CPC
            base_cvr = random.uniform(0.06, 0.10)    # 6-10% CVR
        else:
            base_ctr = random.uniform(0.008, 0.012)  # 0.8-1.2% CTR
            base_cpc = random.uniform(1.20, 1.80)    # $1.20-1.80 CPC
            base_cvr = random.uniform(0.03, 0.06)    # 3-6% CVR

        # Learning phase duration varies by channel
        learning_days = random.randint(3, 5)

        # === SIMULATE PARTIAL CAMPAIGN PROGRESS ===
        # Randomly determine how far through the campaign we are (30% to 95%)
        campaign_progress = random.uniform(0.30, 0.95)
        days_elapsed = int(total_days * campaign_progress)

        # Ensure at least learning_days have passed
        days_elapsed = max(days_elapsed, learning_days + 1)

        # Reset random seed for daily variance
        random.seed()

        for day in range(days_elapsed): # Only generate data for elapsed days
            current_date = start_date + timedelta(days=day)
            day_of_week = current_date.weekday() # 0=Monday, 6=Sunday

            # === LEARNING PHASE ===
            if day < learning_days:
                learning_penalty = 1.0 - (0.4 * (learning_days - day) / learning_days)
            else:
                learning_penalty = 1.0

            # === OPTIMIZATION TREND ===
            # Use total_days for trend calculation so optimization is realistic
            optimization_factor = 1.0 + (0.3 * (day / total_days))

            # === DAY OF WEEK PATTERNS ===
            if day_of_week >= 5: # Weekend
                weekend_factor = random.uniform(0.7, 0.9)
                weekend_ctr_boost = 1.1
            else: # Weekday
                weekend_factor = 1.0
                weekend_ctr_boost = 1.0

            # === DAILY VARIANCE ===
            daily_variance = random.uniform(0.85, 1.15)

            # === OCCASIONAL ANOMALIES ===
            if random.random() < 0.1:
                anomaly = random.choice([0.6, 1.4])
            else:
                anomaly = 1.0

            # === CALCULATE METRICS ===
            spend_efficiency = learning_penalty * random.uniform(0.75, 0.95)
            spend = round(
                daily_budget * spend_efficiency * daily_variance * weekend_factor, 2
            )

            ctr = (
                base_ctr * optimization_factor *
                weekend_ctr_boost * daily_variance * anomaly
            )
            ctr = max(0.005, min(0.05, ctr))

            cpc = base_cpc / (optimization_factor ** 0.5) * daily_variance
            cpc = max(0.20, min(2.50, cpc))

            clicks = int(spend / cpc)
            impressions = int(clicks / ctr) if ctr > 0 else 0

            cvr = base_cvr * optimization_factor * learning_penalty * daily_variance
            cvr = max(0.02, min(0.20, cvr))

            conversions = int(clicks * cvr)

            avg_order_value = random.uniform(20, 30)
            revenue = round(conversions * avg_order_value, 2) if conversions > 0 else 0.0

            raw_metrics = RawAnalyticsModel(
                spend=spend,
                impressions=impressions,
                clicks=clicks,
                conversions=conversions,
                revenue=revenue
            )

            daily_metric = DailyMetricsModel.create(current_date, raw_metrics)
            metrics.append(daily_metric)

        return metrics
