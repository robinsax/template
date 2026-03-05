import sys

sys.path.insert(0, ".")

from flow_tests import cli # pylint: disable=wrong-import-position

cli.run(sys.argv[1:])
