import sys

sys.path.insert(0, ".")

from backend.service import CLIError, cli # pylint: disable=wrong-import-position

try:
    cli.run(sys.argv[1:])
except CLIError as err:
    print(err)
    sys.exit(1)
