from backend.model import CampaignBriefModel, Objective
from backend.ai.chat import AIChatContext
from backend.ai.tools import make_suggest_value

def test_suggest_value():
    context = AIChatContext(None, None)
    suggest_value = make_suggest_value(context, CampaignBriefModel)

    # Invalid field fails.
    context.suggestions = []
    result = suggest_value("invalid_field", "111")
    assert result == "Invalid field"
    assert len(context.suggestions) == 0

    # Enum field works.
    context.suggestions = []
    result = suggest_value("objective", "reach")
    assert result == "Success"
    assert len(context.suggestions) == 1
    assert context.suggestions[0].key == "objective"
    assert context.suggestions[0].value == Objective.REACH

    # Enum fields validated.
    context.suggestions = []
    result = suggest_value("objective", "111")
    assert result == "Invalid enum value"
    assert len(context.suggestions) == 0

    # Datetime suggestions work.
    context.suggestions = []
    result = suggest_value("start_date", "2025-08-06T00:00:00")
    assert result == "Success"
    assert len(context.suggestions) == 1
    assert context.suggestions[0].key == "start_date"
    assert context.suggestions[0].value == "2025-08-06T00:00:00Z"

    # Number fields work.
    context.suggestions = []
    result = suggest_value("budget", "10000")
    assert result == "Success"
    assert len(context.suggestions) == 1
    assert context.suggestions[0].key == "budget"
    assert context.suggestions[0].value == 10000
