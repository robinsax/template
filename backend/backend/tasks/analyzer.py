"""
Campaign analysis.
"""
import os
import json
from typing import Optional
from datetime import timedelta
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from backend.model import (
    Campaign, CampaignChannel, CampaignAnalysisFindingType, CampaignStatus,
    CampaignAnalysisPriority, CampaignAnalysisFinding, CampaignAnalysis,
    CampaignAnalysisSource, CampaignAnalysisSentiment, Finding, Objective,
    current_datetime
)
from backend.ai import generate_channel_findings
from backend.analytics import AnalyticsModel, get_analytics_backend
from backend.service import task, task_batch_query

Threshold = dict[str, float]
MetricThreshold = dict[str, Threshold]
ObjectiveThreshold = dict[str, MetricThreshold]
ChannelThresholds = dict[str, ObjectiveThreshold]

# (metric_key, low_is_good, low_finding_type, high_finding_type)
MetricConfig = tuple[str, bool, CampaignAnalysisFindingType, CampaignAnalysisFindingType]

METRIC_CONFIGS: list[MetricConfig] = [
    MetricConfig((
        "cpa", True,
        CampaignAnalysisFindingType.LOW_CPA,
        CampaignAnalysisFindingType.HIGH_CPA
    )),
    MetricConfig((
        "cpc", True,
        CampaignAnalysisFindingType.LOW_CPC,
        CampaignAnalysisFindingType.HIGH_CPC
    )),
    MetricConfig((
        "cpm", True,
        CampaignAnalysisFindingType.LOW_CPM,
        CampaignAnalysisFindingType.HIGH_CPM
    )),
    MetricConfig((
        "ctr", False,
        CampaignAnalysisFindingType.LOW_CTR,
        CampaignAnalysisFindingType.HIGH_CTR
    )),
    MetricConfig((
        "roas", False,
        CampaignAnalysisFindingType.LOW_ROAS,
        CampaignAnalysisFindingType.HIGH_ROAS
    ))
]

def _load_thresholds() -> ChannelThresholds:
    """
    Load the thresholds from the JSON file.
    """
    file_path = os.path.join(os.path.dirname(__file__), "analyzer_thresholds.json")
    with open(file_path, "r", encoding="utf-8") as fh:
        data = json.load(fh)

    return data

def _check_metric_threshold(
    channel_id: str,
    metric_value: float,
    threshold: Threshold,
    low_finding_type: CampaignAnalysisFindingType,
    high_finding_type: CampaignAnalysisFindingType,
    low_is_good: bool = True
) -> Optional[Finding]:
    """
    Check if a metric is outside threshold bounds and return appropriate findings.

    Low values are good for costs, bad for performance.
    """
    if metric_value < threshold["low"]:
        return Finding(
            channel_id=channel_id,
            priority=(
                CampaignAnalysisPriority.LOW if low_is_good
                else CampaignAnalysisPriority.HIGH
            ),
            type=low_finding_type,
            sentiment=(
                CampaignAnalysisSentiment.POSITIVE if low_is_good
                else CampaignAnalysisSentiment.NEGATIVE
            )
        )

    if metric_value > threshold["high"]:
        return Finding(
            channel_id=channel_id,
            priority=(
                CampaignAnalysisPriority.HIGH if low_is_good
                else CampaignAnalysisPriority.LOW
            ),
            type=high_finding_type,
            sentiment=(
                CampaignAnalysisSentiment.NEGATIVE if low_is_good
                else CampaignAnalysisSentiment.POSITIVE
            )
        )

    return None

def rule_analysis(
    campaign: Campaign, channel: CampaignChannel, analytics: AnalyticsModel
) -> list[Finding]:
    """
    Run rule-based analysis on a campaign channel.
    """
    thresholds = _load_thresholds()

    channel_key = channel.channel_key
    if channel_key not in thresholds.keys():
        return []

    objective = "Awareness"
    if campaign.brief.objective in (
        Objective.TRAFFIC, Objective.VIDEO_VIEWS, Objective.COMMUNITY_INTERACTION
    ):
        objective = "Consideration"
    elif campaign.brief.objective in (
        Objective.LEAD_GENERATION, Objective.WEBSITE_CONVERSIONS
    ):
        objective = "Conversion"

    if objective not in thresholds[channel_key]:
        return []

    # Compare against campaign totals for robustness against daily fluctuations.
    metrics = analytics.totals.computed.model_dump()

    objective_thresholds = thresholds[channel_key][objective]

    findings = []
    for metric_key, low_is_good, low_type, high_type in METRIC_CONFIGS:
        if metrics[metric_key] is not None and metric_key in objective_thresholds:
            finding = _check_metric_threshold(
                channel.id, metrics[metric_key], objective_thresholds[metric_key],
                low_type, high_type, low_is_good
            )
            if finding:
                findings.append(finding)

    return findings

def ai_analysis(
    campaign: Campaign, channel: CampaignChannel, analytics: AnalyticsModel
) -> list[Finding]:
    """
    Run AI-based analysis on a campaign channel.
    """
    findings = []

    findings.extend(generate_channel_findings(
        CampaignAnalysisFindingType.INSIGHT,
        campaign, channel, analytics
    ))

    findings.extend(generate_channel_findings(
        CampaignAnalysisFindingType.RECOMMENDATION,
        campaign, channel, analytics
    ))

    findings.extend(generate_channel_findings(
        CampaignAnalysisFindingType.PREDICTION,
        campaign, channel, analytics
    ))

    return findings

def run_campaign_analysis(session: Session, campaign: Campaign):
    """
    Run channel level analysis on the given campaign.
    """
    findings: list[CampaignAnalysisFinding] = []
    priorities = list(CampaignAnalysisPriority)
    max_priority = priorities[0]
    sentiments = list(CampaignAnalysisSentiment)
    sentiment_counts = { sentiment: 0 for sentiment in sentiments }

    def convert_findings(targets: list[Finding], source: CampaignAnalysisSource):
        """
        Convert the given `targets` to `CampaignAnalysisFinding` and add them to the
        `findings` list.
        """
        nonlocal max_priority

        for target in targets:
            if priorities.index(target.priority) > priorities.index(max_priority):
                max_priority = target.priority

            sentiment_counts[target.sentiment] += 1

            findings.append(CampaignAnalysisFinding(
                campaign_id=campaign.id,
                channel_id=target.channel_id,
                priority=target.priority,
                type=target.type,
                sentiment=target.sentiment,
                data=target.data,
                source=source
            ))

    analytics_backend = get_analytics_backend()
    for channel in campaign.channels:
        # Collect analytics.
        analytics = analytics_backend.get_analytics(campaign, [channel])

        # Run analysis.
        convert_findings(
            rule_analysis(campaign, channel, analytics),
            CampaignAnalysisSource.RULE
        )
        convert_findings(
            ai_analysis(campaign, channel, analytics),
            CampaignAnalysisSource.AI
        )

    overall_sentiment = CampaignAnalysisSentiment.NEUTRAL
    diff = (
        sentiment_counts[CampaignAnalysisSentiment.POSITIVE] -
        sentiment_counts[CampaignAnalysisSentiment.NEGATIVE]
    )
    if diff > 2:
        overall_sentiment = CampaignAnalysisSentiment.POSITIVE
    elif diff < -2:
        overall_sentiment = CampaignAnalysisSentiment.NEGATIVE

    # Save.
    analysis = CampaignAnalysis(
        campaign_id=campaign.id,
        priority=max_priority,
        sentiment=overall_sentiment,
        findings=findings,
        created_at=current_datetime()
    )
    campaign.analyzed_at = current_datetime()

    session.add(analysis)
    session.commit()

@task(interval_seconds=60 * 60)
def analyze_campaigns(session: Session):
    """
    Analyze live campaigns that have not been analyzed in the last 24 hours.
    """
    batches = task_batch_query(
        session, Campaign,
        and_(
            or_(
                Campaign.status_column() == CampaignStatus.LIVE.value,
                Campaign.pre_revision_status_column() == CampaignStatus.LIVE.value
            ),
            or_(
                Campaign.analyzed_at.is_(None),
                current_datetime() - Campaign.analyzed_at > timedelta(hours=24)
            )
        )
    )

    for campaign in batches:
        run_campaign_analysis(session, campaign)
