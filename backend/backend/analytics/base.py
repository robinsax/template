from datetime import datetime
from typing import Optional
from collections import defaultdict

from kedet.model import Model, Campaign, CampaignChannel
from kedet.channels import get_ad_platform_for_channel

class RawAnalyticsModel(Model):
    '''
    Raw advertising analytics collected from ad platforms for a single day.
    '''
    spend: float
    impressions: Optional[int] = None
    clicks: Optional[int] = None
    conversions: Optional[int] = None
    revenue: Optional[float] = None

class RawAnalyticsTrendModel(Model):
    spend: Optional[float] = None
    impressions: Optional[float] = None
    clicks: Optional[float] = None
    conversions: Optional[float] = None
    revenue: Optional[float] = None

class PerformanceMetricsModel(Model):
    '''
    Derived advertising performance metrics calculated from raw data.
    '''
    cpa: Optional[float] = None
    '''
    Cost per acquisition (spend / conversions)
    '''
    cpc: Optional[float] = None
    '''
    Cost per click (spend / clicks)
    '''
    cpm: Optional[float] = None
    '''
    Cost per thousand impressions (spend / impressions * 1000)
    '''
    ctr: Optional[float] = None
    '''
    Click-through rate (clicks / impressions)
    '''
    roas: Optional[float] = None
    '''
    Return on ad spend (revenue / spend)
    '''

class DailyMetricsModel(Model):
    '''
    Daily metrics for a campaign, optionally broken down by channel.
    '''
    date: datetime
    raw: RawAnalyticsModel
    computed: PerformanceMetricsModel

    @classmethod
    def _calculate_performance_metrics(
        cls, raw: RawAnalyticsModel
    ) -> PerformanceMetricsModel:
        '''
        Calculate derived metrics (CPA, CPC, CPM, CTR, ROAS) from raw data.
        '''
        cpa = None
        cpc = None
        cpm = None
        ctr = None
        roas = None

        if raw.conversions and raw.conversions > 0:
            cpa = raw.spend / raw.conversions

        if raw.clicks and raw.clicks > 0:
            cpc = raw.spend / raw.clicks

        if raw.impressions and raw.impressions > 0:
            cpm = (raw.spend / raw.impressions) * 1000

        if raw.impressions and raw.impressions > 0 and raw.clicks:
            ctr = raw.clicks / raw.impressions

        if raw.spend > 0 and raw.revenue:
            roas = raw.revenue / raw.spend

        return PerformanceMetricsModel(
            cpa=cpa,
            cpc=cpc,
            cpm=cpm,
            ctr=ctr,
            roas=roas
        )

    @classmethod
    def create(
        cls, date: datetime, raw: RawAnalyticsModel
    ) -> 'DailyMetricsModel':
        return cls(
            date=date,
            raw=raw,
            computed=cls._calculate_performance_metrics(raw)
        )

    def calculate_trends_against_previous(
        self, previous_day: 'DailyMetricsModel'
    ) -> tuple[RawAnalyticsTrendModel, PerformanceMetricsModel]:
        '''
        Calculate day-over-day trend metrics.
        '''
        def trend(curr: float, prev: float) -> Optional[float]:
            return ((curr - prev) / prev) if prev > 0 else None

        raw = RawAnalyticsTrendModel(
            spend=trend(
                self.raw.spend,
                previous_day.raw.spend
            ),
            impressions=trend(
                self.raw.impressions or 0,
                previous_day.raw.impressions or 0
            ),
            clicks=trend(
                self.raw.clicks or 0,
                previous_day.raw.clicks or 0
            ),
            conversions=trend(
                self.raw.conversions or 0,
                previous_day.raw.conversions or 0
            ),
            revenue=trend(
                self.raw.revenue or 0,
                previous_day.raw.revenue or 0
            )
        )

        computed = PerformanceMetricsModel(
            cpa=trend(
                self.computed.cpa or 0,
                previous_day.computed.cpa or 0
            ),
            cpc=trend(
                self.computed.cpc or 0,
                previous_day.computed.cpc or 0
            ),
            cpm=trend(
                self.computed.cpm or 0,
                previous_day.computed.cpm or 0
            ),
            ctr=trend(
                self.computed.ctr or 0,
                previous_day.computed.ctr or 0
            ),
            roas=trend(
                self.computed.roas or 0,
                previous_day.computed.roas or 0
            )
        )

        return raw, computed

class AnalyticsModel(Model):
    '''
    Aggregated analytics for a single campaign including:
    - Aggregated daily metrics with performance calculations, including totals.
    - Pacing metrics (budget vs spend, elapsed time).
    - Burn rate analysis (current vs target daily spend).
    - Spend projections and forecasting.
    - Day-over-day trend analysis.
    '''
    budget: float
    totals: DailyMetricsModel
    daily_metrics: list[DailyMetricsModel]
    last_day_raw_trends: Optional[RawAnalyticsTrendModel] = None
    last_day_computed_trends: Optional[PerformanceMetricsModel] = None
    elapsed_time_percentage: float
    current_daily_spend: float
    target_daily_spend: float
    projected_final_spend: float

    @classmethod
    def _aggregate_daily_metrics_from_channels(
        cls, daily_metrics_by_channel: dict[str, list[DailyMetricsModel]]
    ) -> list[DailyMetricsModel]:
        '''
        Aggregate daily metrics from multiple channels.
        '''
        all_dates = set()
        for channel_metrics in daily_metrics_by_channel.values():
            for daily_metric in channel_metrics:
                all_dates.add(daily_metric.date)

        daily_metrics = []
        # Use dict of dicts instead of RawAnalyticsModel
        date_to_metric = defaultdict(lambda: {
            'spend': 0.0,
            'impressions': 0,
            'clicks': 0,
            'conversions': 0,
            'revenue': 0.0
        })

        for channel_metrics in daily_metrics_by_channel.values():
            for daily_metric in channel_metrics:
                date = daily_metric.date
                date_to_metric[date]['spend'] += daily_metric.raw.spend
                date_to_metric[date]['impressions'] += daily_metric.raw.impressions or 0
                date_to_metric[date]['clicks'] += daily_metric.raw.clicks or 0
                date_to_metric[date]['conversions'] += daily_metric.raw.conversions or 0
                date_to_metric[date]['revenue'] += daily_metric.raw.revenue or 0.0

        for date in sorted(all_dates):
            raw_aggregate = RawAnalyticsModel(**date_to_metric[date])
            daily_aggregate = DailyMetricsModel.create(date, raw_aggregate)
            daily_metrics.append(daily_aggregate)

        return daily_metrics

    @classmethod
    def _calculate_totals(
        cls, daily_metrics: list[DailyMetricsModel]
    ) -> DailyMetricsModel:
        '''
        Calculate totals from daily metrics.
        '''
        totals = {
            'spend': 0.0,
            'impressions': 0,
            'clicks': 0,
            'conversions': 0,
            'revenue': 0.0
        }

        for daily_metric in daily_metrics:
            totals['spend'] += daily_metric.raw.spend
            totals['impressions'] += daily_metric.raw.impressions or 0
            totals['clicks'] += daily_metric.raw.clicks or 0
            totals['conversions'] += daily_metric.raw.conversions or 0
            totals['revenue'] += daily_metric.raw.revenue or 0.0

        raw_totals = RawAnalyticsModel(**totals)
        return DailyMetricsModel.create(datetime.now(), raw_totals)

    @classmethod
    def create( # pylint: disable=too-many-locals
        cls, campaign: Campaign, channels: list[CampaignChannel],
        daily_metrics_by_channel: dict[str, list[DailyMetricsModel]]
    ) -> 'AnalyticsModel':
        '''
        Create an `AnalyticsModel` for the provided `campaign` and `channels`.
        '''
        # Aggregate across channels if needed.
        if len(daily_metrics_by_channel) > 1:
            daily_metrics = cls._aggregate_daily_metrics_from_channels(
                daily_metrics_by_channel
            )
        else:
            daily_metrics = list(daily_metrics_by_channel.values())[0]

        # Calculate totals.
        totals = cls._calculate_totals(daily_metrics)

        budget = 0
        for channel in channels:
            budget += (channel.budget_allocation * campaign.brief.budget)

        start_date = campaign.brief.start_date
        total_duration_days = campaign.duration_days
        if total_duration_days is None:
            total_duration_days = 0

        latest_date = max(day.date for day in daily_metrics)
        elapsed_days = (latest_date - start_date).days + 1

        # Elapsed time percentage.
        elapsed_time_percentage = 1.0
        if total_duration_days > 0:
            elapsed_time_percentage = min(elapsed_days / total_duration_days, 1.0)

        # Current spend and projections.
        current_daily_spend = (
            totals.raw.spend / len(daily_metrics) if daily_metrics else 0.0
        )
        target_daily_spend = (
            budget / total_duration_days if total_duration_days > 0 else 0.0
        )

        # Projected final spend.
        projected_final_spend = totals.raw.spend
        if elapsed_days < total_duration_days:
            remaining_days = total_duration_days - elapsed_days
            projected_final_spend = (
                totals.raw.spend + (current_daily_spend * remaining_days)
            )

        # Last day trends.
        last_day_raw_trends = None
        last_day_computed_trends = None
        if len(daily_metrics) > 1:
            last_day_raw_trends, last_day_computed_trends = (
                daily_metrics[-1].calculate_trends_against_previous(daily_metrics[-2])
            )

        return cls(
            budget=budget,
            daily_metrics=daily_metrics,
            totals=totals,
            last_day_raw_trends=last_day_raw_trends,
            last_day_computed_trends=last_day_computed_trends,
            elapsed_time_percentage=elapsed_time_percentage,
            current_daily_spend=current_daily_spend,
            target_daily_spend=target_daily_spend,
            projected_final_spend=projected_final_spend
        )

class AnalyticsBackend:
    def get_analytics(
        self, campaign: Campaign, channels: list[CampaignChannel] = None
    ) -> AnalyticsModel:
        '''
        Build comprehensive analytics for a campaign by aggregating data from all 
        channels.

        This method:
        1. Extracts platform-specific IDs from each campaign channel
        2. Loads raw daily metrics for each channel from the analytics backend
        3. Aggregates all channel data into campaign-level daily totals
        4. Computes performance metrics (CPA, CPC, CPM, CTR, ROAS) and trends
        5. Calculates campaign-level metrics (pacing, burn rate, projections)

        Returns a fully populated `AnalyticsModel` with aggregated daily metrics and
        campaign insights ready for analysis and reporting.
        '''
        if not channels:
            channels = campaign.channels

        daily_metrics_by_channel = {}
        for channel in channels:
            platform = get_ad_platform_for_channel(channel.channel_key)
            ids = platform.get_analytics_target_ids(channel)
            metrics = self.get_channel_metrics(channel, ids)

            daily_metrics_by_channel[channel.channel_key] = metrics

        return AnalyticsModel.create(
            campaign,
            channels,
            daily_metrics_by_channel
        )

    def get_channel_metrics(
        self, channel: CampaignChannel, ids: list[str]
    ) -> list[DailyMetricsModel]:
        '''
        Load daily analytics data for a specific campaign channel.

        Returns a list of `DailyMetricsModel` containing raw analytics data for each day,
        with date and `RawAnalyticsModel` populated but performance metrics and trends
        not yet calculated.

        Implementations must override.
        '''
        raise NotImplementedError()
