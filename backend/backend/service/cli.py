"""
CLI registrar and runtime.
"""
import inspect
from dataclasses import dataclass
from typing import Callable, Optional

from .database import get_session

DEFAULT_ARG_VALUE = "true"

class CLIError(Exception):
    """
    Raised when CLI arguments are invalid.
    """

@dataclass
class CLIOptions:
    with_session: bool
    args: list[str]
    short_names: Optional[dict[str, str]]

class CLI:
    """
    CLI runtime implementation. Registers "verbs" via decorator and parses provided
    arguments against their type annotations.

    E.g.:
    ```py
    @cli.verb(with_session=True, short_names={ "b": "bar" })
    def do_thing(session: Session, *, foo: str, bar: str):
        # ...
    ```
    would be run as:
    ```bash
    python -m backend do thing --foo foo -b bar
    ```

    Use the global instance `cli`.
    """
    root_verb: str
    verbs: dict[str, tuple[Callable, CLIOptions]]

    def __init__(self, root_verb: str):
        self.root_verb = root_verb
        self.verbs = {}

    def verb(
        self, *,
        with_session: bool = False, short_names: Optional[dict[str, str]] = None
    ):
        """
        Decorator for CLI verbs.
        """
        opts = CLIOptions(
            with_session=with_session,
            short_names=short_names,
            args=[]
        )

        def decorator(fn: Callable):
            opts.args = list(inspect.signature(fn).parameters)
            if "session" in opts.args:
                opts.args.remove("session")

            self.verbs[" ".join(fn.__name__.split("_"))] = (fn, opts)
            return fn

        return decorator

    def _parse_args(self, argv: list[str]) -> tuple[Callable, CLIOptions, dict]:
        """
        Parse CLI arguments.
        """
        cur = argv[0]
        name_parts = []
        while not cur.startswith("-"):
            name_parts.append(cur)
            argv.pop(0)

            if not argv:
                break
            cur = argv[0]

        verb = " ".join(name_parts)
        if verb not in self.verbs:
            raise CLIError(f"Unknown verb: { verb }")

        fn, opts = self.verbs[verb]

        parsed = {}
        cur_key = None
        for arg in argv:
            if arg.startswith("--"):
                if cur_key:
                    parsed[cur_key] = DEFAULT_ARG_VALUE
                    cur_key = None

                cur_key = "_".join(arg[2:].split("-"))
                if cur_key not in opts.args:
                    raise CLIError(f"Unknown argument: { arg }")
            elif arg.startswith("-"):
                if cur_key:
                    parsed[cur_key] = DEFAULT_ARG_VALUE
                    cur_key = None

                cur_key = opts.short_names.get("_".join(arg[1:].split("-")))
                if cur_key is None:
                    raise CLIError(f"Unknown argument: { arg }")
            elif cur_key:
                parsed[cur_key] = arg
                cur_key = None
            else:
                raise CLIError(arg)

        if cur_key:
            parsed[cur_key] = DEFAULT_ARG_VALUE

        return fn, opts, parsed

    def _show_help(self):
        """
        Show help for the CLI.
        """
        keys = sorted(self.verbs.keys())
        for verb in keys:
            fn, opts = self.verbs[verb]
            print(verb)

            for arg in opts.args:
                arg_desc = "--" + "-".join(arg.split("_"))
                if opts.short_names:
                    for short_name, full_name in opts.short_names.items():
                        if full_name == arg:
                            arg_desc += ", -" + short_name
                            break

                print("  " + arg_desc + " <value>")

            if fn.__doc__:
                show_doc = fn.__doc__.rstrip()
                if not opts.args:
                    show_doc = show_doc[1:]

                print(show_doc)

    def run(self, argv: list[str]):
        """
        Run the CLI.
        """
        if len(argv) < 1:
            self._show_help()
            raise CLIError(f"Usage: { self.root_verb } <command>")

        fn, opts, args = self._parse_args(argv)

        if opts.with_session:
            session_gen = get_session()
            session = next(session_gen)
            try:
                fn(session, **args)
            finally:
                try:
                    next(session_gen)
                except StopIteration:
                    pass
        else:
            fn(**args)

cli = CLI("backend")
"""
Global `CLI` instance.
"""
