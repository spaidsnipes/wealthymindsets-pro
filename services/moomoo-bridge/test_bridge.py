import importlib.util
import pathlib
import unittest


SPEC = importlib.util.spec_from_file_location(
    "moomoo_bridge",
    pathlib.Path(__file__).with_name("bridge.py"),
)
bridge = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(bridge)


class ProviderTimestampTests(unittest.TestCase):
    def test_us_market_clock_becomes_explicit_epoch(self):
        self.assertEqual(
            bridge.provider_timestamp_ms("US.TSLA", "2026-08-31 09:30:01.250"),
            1788183001250,
        )

    def test_unknown_market_and_bad_clock_fail_closed(self):
        self.assertIsNone(bridge.provider_timestamp_ms("XX.TEST", "2026-08-31 09:30:01"))
        self.assertIsNone(bridge.provider_timestamp_ms("US.TSLA", "not-a-clock"))


if __name__ == "__main__":
    unittest.main()
