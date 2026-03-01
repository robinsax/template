from datetime import datetime
from collections import defaultdict

from google.cloud import bigquery

from backend.config import config
from backend.model import CampaignChannel

from .base import AnalyticsBackend, DailyMetricsModel, RawAnalyticsModel

class BigQueryAnalyticsBackend(AnalyticsBackend):
    """
    BigQuery analytics backend.
    """
    def __init__(self):
        self.client = bigquery.Client(project=config.bigquery_project_id.get())
        self.dataset_id = config.bigquery_dataset_id.get()
        self.table_name = config.bigquery_table_name.get()

    def _query(self, ids: list[str]) -> bigquery.table.RowIterator:
        """
        Query BigQuery for raw analytics data.
        """
        query = f"""
            SELECT
                date,
                platform_id,
                spend,
                impressions,
                clicks,
                conversions,
                revenue
            FROM `{self.dataset_id}.{self.table_name}`
            WHERE platform_id IN UNNEST(@platform_ids)
            ORDER BY date ASC
        """

        job_config = bigquery.QueryJobConfig(query_parameters=[
            bigquery.ArrayQueryParameter("platform_ids", "STRING", ids)
        ])

        query_job = self.client.query(query, job_config=job_config)

        return query_job.result()

    def _aggregate_results(
        self, results: bigquery.table.RowIterator
    ) -> list[DailyMetricsModel]:
        """
        Aggregate raw analytics data by date across all platform IDs.
        """
        date_aggregates = defaultdict(lambda: {
            "spend": 0.0,
            "impressions": 0,
            "clicks": 0,
            "conversions": 0,
            "revenue": 0.0
        })

        for row in results:
            date = row["date"]
            if isinstance(date, str):
                date = datetime.fromisoformat(date)

            # Aggregate metrics across all IDs for this date
            date_aggregates[date]["spend"] += float(row["spend"] or 0.0)
            date_aggregates[date]["impressions"] += int(row["impressions"] or 0)
            date_aggregates[date]["clicks"] += int(row["clicks"] or 0)
            date_aggregates[date]["conversions"] += int(row["conversions"] or 0)
            date_aggregates[date]["revenue"] += float(row["revenue"] or 0.0)

        # Convert aggregated data to DailyMetricsModel objects
        metrics = []
        for date in sorted(date_aggregates.keys()):
            raw = RawAnalyticsModel(
                spend=date_aggregates[date]["spend"],
                impressions=date_aggregates[date]["impressions"],
                clicks=date_aggregates[date]["clicks"],
                conversions=date_aggregates[date]["conversions"],
                revenue=date_aggregates[date]["revenue"]
            )
            daily_metric = DailyMetricsModel.create(date, raw)
            metrics.append(daily_metric)

        return metrics

    def get_channel_metrics(
        self, channel: CampaignChannel, ids: list[str]
    ) -> list[DailyMetricsModel]:
        """
        Load raw analytics for the given campaign channel.

        Queries BigQuery for all platform campaign IDs associated with this 
        channel, aggregates metrics by date across all IDs, and returns daily 
        metrics sorted by date.
        """
        if not ids:
            return []

        results = self._query(ids)

        return self._aggregate_results(results)
