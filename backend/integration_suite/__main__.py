import sys

sys.path.insert(0, ".")

from integration_suite import cli # pylint: disable=wrong-import-position

cli.run(sys.argv[1:])
