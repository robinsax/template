"""
A backend integration test suite.

Interacts with a running API service in "integration test" mode, which skips some
un-mockable logic. Invokes background tasks manually to control execution order.

Composed of a collection of "steps", each of which is a small unit of work within a use
case, with a declared dependency on other steps. These steps are then composed to form
execution chains which perform complex use cases.

Steps named `assert_<name>` are the final assertions that are executed to during CI or
local checks, but the coverage provided by non-assertion steps is also part of the test
coverage.
"""
import os
import sys
import shutil
import random
import logging
import traceback
from typing import Optional

from backend.config import config
from backend.service import CLI
from backend.model import Notification

from .base import (
    StepsContext, IntegrationSuiteError, plan_steps, get_all_step_names,
    get_step_description, load_mock_locations
)
from .fuzzy import seed_fuzzy
from . import steps

cli = CLI("integration_suite")

@cli.verb()
def list_steps():
    """
    List available steps.
    """
    for step_name in sorted(get_all_step_names()):
        print(step_name + ": " + get_step_description(step_name))

def _run(
    step: str, root_url: Optional[str] = None, plan_only: bool = False,
    loud: bool = False, no_dump: bool = False, fuzzy_seed: Optional[int] = None
):
    # Reset test data.
    shutil.rmtree(".testdata", ignore_errors=True)
    os.mkdir(".testdata")

    # Tell certain guys to shut up.
    logging.getLogger("urllib3.connectionpool").setLevel(logging.WARNING)
    logging.getLogger("platform_mocks.common").setLevel(logging.WARNING)

    # Default to canonical address for integration mode API deployments.
    root_url = root_url or "http://localhost:8500/api/v1"

    # Force config.
    config.service_origin.set("https://kedet-integration-suite.com")
    config.integration_test_mode.set(True)

    context = StepsContext(root_url)

    with context.get_session() as session:
        # Reset notifications.
        session.query(Notification).delete() # pylint: disable=no-member

        # Populate locations.
        load_mock_locations(session)

    chain = plan_steps(step)

    # Presentation.
    def show_step(index: int, indent: int = 0):
        step_info = chain[index]

        print(" " * (indent * 2) + "-> " + step_info.get_name(), end="")
        if step_info.is_branch:
            print(": branch (cases known on run)")
        else:
            print()

    if plan_only:
        print("=== Plan for " + step + " ===")
        def show_one(index: int, indent: int = 0):
            if index >= len(chain):
                return

            step_info = chain[index]

            show_step(index, indent)
            if step_info.is_branch:
                for i in range(2):
                    print(" " * ((indent + 1) * 2) + "-> branch " + str(i))
                    show_one(index + 1, indent + 2)
                print(" " * ((indent + 1) * 2) + "-> etc...")
            else:
                show_one(index + 1, indent)

        show_one(0)
        print("===")
        return

    # Run.
    def run_one(
        index: int, cur_context: StepsContext, branch_i: Optional[int] = None,
        indent: int = 0
    ):
        if index >= len(chain):
            if loud:
                print("=== Final step reached ===")
                print(cur_context.get_log())
            return

        step_info = chain[index]
        print(
            " " * (indent * 2) + "-> " + step_info.get_name() +
            ("[" + str(branch_i) + "]" if branch_i is not None else "")
        )

        try:
            contexts = cur_context.run_step(step_info)
        except BaseException:
            print()
            if not no_dump:
                print("=== Dumping branch log ===")
                print(cur_context.get_log())
                print("===")
            raise

        new_indent = indent + 1 if len(contexts) > 1 else indent
        for i, inner_context in enumerate(contexts):
            run_one(
                index + 1, inner_context, i if len(contexts) > 1 else None, new_indent
            )

    # Seed fuzzy.
    if fuzzy_seed is None:
        fuzzy_seed = random.randint(1, 10000)
    print("Fuzzy seed: " + str(fuzzy_seed))
    seed_fuzzy(fuzzy_seed)

    run_one(0, context)
    print("Passed.")

@cli.verb(short_names={
    "s": "step", "r": "root_url", "p": "plan", "l": "loud", "f": "fuzzy_seed"
})
def run(
    step: str, root_url: Optional[str] = None, plan: bool = False, loud: bool = False,
    no_dump: bool = False, fuzzy_seed: Optional[int] = None
):
    """
    Run the integration suite up to a step.

    Use --plan to only show the plan without executing.
    """
    _run(step, root_url, plan, loud, no_dump, fuzzy_seed)

@cli.verb(short_names={ "r": "root_url" })
def run_asserts(root_url: Optional[str] = None, no_dump: bool = False):
    """
    Run all assertions.
    """
    assert_steps = get_all_step_names(True)

    passes = 0
    fails = []
    for step in assert_steps:
        print("=== " + step + " ===")
        try:
            _run(step, root_url, no_dump=no_dump)
            passes += 1
        except IntegrationSuiteError as err:
            fails.append((step, err))

    print("=== Summary ===")
    print("Passes: " + str(passes))
    print("Fails: " + str(len(fails)))
    for step, err in fails:
        print("== " + step + " ==")
        print(err)
        print("".join(traceback.format_tb(err.__traceback__)))
        if err.__cause__:
            print("Cause: " + str(err.__cause__))
            print("".join(traceback.format_tb(err.__cause__.__traceback__)))

    sys.exit(1 if len(fails) > 0 else 0)
