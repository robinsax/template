'''
Step declarations.
'''
import inspect
from collections import deque
from dataclasses import dataclass
from typing import Optional, Callable, Union

from .errors import IntegrationSuiteError

StepRef = Union[str, Callable]

@dataclass
class OutputInjection:
    '''
    Sentinel value representing that a step argument should be injected with the
    output of another step.
    '''
    step_ref: StepRef
    key: Optional[str]
    subchain: Optional[str]

def output(
    step_ref: StepRef, key: Optional[str] = None, *,
    subchain: Optional[str] = None
):
    '''
    Default value annotation for step arguments that will cause them to receive the
    specified output from another step.
    '''
    return OutputInjection(step_ref=step_ref, key=key, subchain=subchain)

@dataclass
class StepNeedsAny:
    '''
    Representation of an "any of" dependency.
    '''
    steps: list[str]

def any_of(*steps: StepRef):
    '''
    Declare a set of steps such that at least one of them must be met.
    '''
    return StepNeedsAny(steps=_resolve_refs(steps))

@dataclass
class StepSubchains:
    '''
    Representation of a "subchain" dependency.
    '''
    count: int
    from_step: str
    branch_at: Optional[str]

def subchains(
    count: int, from_step: StepRef, branch_at: Optional[StepRef] = None
):
    '''
    Declare a dependency on a set of steps for `from_step` being run multiple times,
    where the chains branch at `branch_at`.
    '''
    return StepSubchains(
        count=count,
        from_step=_resolve_refs([from_step])[0],
        branch_at=_resolve_refs([branch_at])[0] if branch_at else None
    )

@dataclass
class StepInfo:
    '''
    Registered information for a step.
    '''
    fn: Callable
    is_assert: bool
    is_branch: bool
    needs: list[Union[str, list[str]]]
    subchain: Optional[str]

    def get_name(self) -> str:
        name = self.fn.__name__
        if self.subchain:
            name += ':' + self.subchain
        return name

    def with_subchain(self, subchain: str) -> 'StepInfo':
        if self.subchain:
            if subchain:
                subchain = self.subchain + ':' + subchain
            else:
                subchain = self.subchain

        return StepInfo(
            fn=self.fn,
            is_assert=self.is_assert,
            is_branch=self.is_branch,
            needs=self.needs,
            subchain=subchain
        )

# Step registry.
_steps: dict[str, StepInfo] = {}

def _resolve_refs(refs: list[StepRef]) -> list[str]:
    resolved = []
    for ref in refs:
        if isinstance(ref, (StepNeedsAny, StepSubchains)):
            resolved.append(ref)
        elif isinstance(ref, str):
            resolved.append(ref)
        else:
            resolved.append(ref.__name__)

    return resolved

def step(
    needs: Optional[list[StepRef, StepNeedsAny, StepSubchains]] = None, *,
    is_assert: Optional[bool] = None, is_branch: Optional[bool] = None
):
    '''
    Decorator for integration suite steps.
    '''
    def decorator(fn):
        injected_outputs = {
            name: param.default
            for name, param in inspect.signature(fn).parameters.items()
            if isinstance(param.default, OutputInjection)
        }
        fn._injected_outputs = injected_outputs # pylint: disable=protected-access

        _steps[fn.__name__] = StepInfo(
            fn=fn,
            is_assert=(
                fn.__name__.startswith('assert_') if is_assert is None else is_assert
            ),
            is_branch=fn.__name__.startswith('each_') or is_branch,
            needs=_resolve_refs(needs or []),
            subchain=None
        )

        return fn

    return decorator

def get_step_description(step_name: str) -> str:
    return (_steps[step_name].fn.__doc__ or str()).rstrip()

def get_all_step_names(asserts_only: bool = False) -> list[str]:
    return [
        step_name
        for step_name, info in _steps.items()
        if not asserts_only or info.is_assert
    ]

def plan_steps( # pylint: disable=too-many-locals,too-many-statements
    final_step_name: str
) -> list[StepInfo]:
    '''
    Return a list of steps to run to reach the final step. Ordering attempts to respect
    declared order of needs.

    Must be invoked in order with a shared context.
    '''
    if final_step_name not in _steps:
        raise IntegrationSuiteError(f'Unknown step: { final_step_name }')

    # Collect all concrete needs.
    concrete_needs = set()
    search_queue = [final_step_name]
    scanned = set()

    while search_queue:
        cur = search_queue.pop()
        if cur in scanned:
            continue
        scanned.add(cur)

        for need in _steps[cur].needs:
            if isinstance(need, StepNeedsAny):
                # Scan all options to find their concrete references in other needs
                # declares.
                for option in need.steps:
                    search_queue.append(option)
                continue

            if isinstance(need, StepSubchains):
                # Skip to resolve at end.
                continue

            if isinstance(need, str):
                concrete_needs.add(need)
                search_queue.append(need)

    # Build needed set, choosing "any of" based on concrete needs.
    needed = set()
    visit_queue = [final_step_name]
    chosen = {}

    while visit_queue:
        cur = visit_queue.pop()
        if cur in needed:
            continue
        needed.add(cur)

        for need in _steps[cur].needs:
            if isinstance(need, str):
                visit_queue.append(need)
                continue

            if isinstance(need, StepSubchains):
                # Skip to resolve at end.
                continue

            # "Any of" dependency - prefer one already in concrete_needs.
            chosen_option = None
            for option in need.steps:
                if option in concrete_needs:
                    chosen_option = option
                    break

                if chosen_option is None:
                    chosen_option = option

            chosen[id(need)] = chosen_option
            visit_queue.append(chosen_option)

    # Build graph with only needed steps.
    graph = {name: [] for name in needed}
    in_degree = {name: 0 for name in needed}
    # Track ordering per edge.
    edge_order: dict[tuple[str, str], int] = {}

    for name in needed:
        edge_index = 0

        for need in _steps[name].needs:
            if isinstance(need, StepSubchains):
                # Skip to resolve at end.
                continue

            if isinstance(need, str):
                graph[need].append(name)
                in_degree[name] += 1

                edge_order[(need, name)] = edge_index
                edge_index += 1
            else:
                # Use the previously chosen option.
                option = chosen[id(need)]
                if option in needed:
                    graph[option].append(name)
                    in_degree[name] += 1

                    edge_order[(option, name)] = edge_index
                    edge_index += 1

    # Topo sort, Kahn's.
    queue = deque([
        name for name, deg in in_degree.items() if deg == 0
    ])
    plan = []
    while queue:
        cur = queue.popleft()
        plan.append(cur)

        # Collect steps with dependencies met.
        next_candidates = []
        for neighbor in graph[cur]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                next_candidates.append((edge_order[(cur, neighbor)], neighbor))

        # Order by edge index.
        next_candidates.sort(key=lambda x: -x[0])
        for _, neighbor in next_candidates:
            queue.append(neighbor)

    if len(plan) != len(needed):
        raise ValueError('Cyclic needs graph')

    plan = [_steps[step_name] for step_name in plan]

    # Recursively resolve subchains.
    handled_subchains = set()
    while True:
        handled_any = False
        for i, step_info in enumerate(plan):
            for need in step_info.needs:
                if id(need) in handled_subchains:
                    continue

                if not isinstance(need, StepSubchains):
                    continue

                # Insert pre-subchain steps if needed.
                if need.branch_at and _steps[need.branch_at] not in plan:
                    plan[i - 1:i - 1] = plan_steps(need.branch_at)

                # Generate subchained steps.
                for j in range(need.count):
                    subchain_steps = plan_steps(need.from_step)
                    if need.branch_at:
                        stop_i = subchain_steps.index(_steps[need.branch_at])
                        subchain_steps = subchain_steps[stop_i + 1:]

                    subchain = [
                        subchain_step.with_subchain(str(j))
                        for subchain_step in subchain_steps
                    ]
                    plan[i - 1:i - 1] = subchain

                handled_subchains.add(id(need))
                handled_any = True
                break

        if not handled_any:
            break

    return plan
