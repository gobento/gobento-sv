import sys
import tempfile
from os import path

sys.path.insert(0, path.join(path.dirname(__file__), "..", "bot"))

import texts  # noqa: E402
from store import Store  # noqa: E402


def test_error_reference_from_start_payload():
    ref = "3f2c9a10-1b2c-4d5e-8f90-123456789abc"
    assert texts.error_reference(f"err_{ref}") == ref
    assert texts.error_reference(None) is None
    assert texts.error_reference("") is None
    assert texts.error_reference("donate") is None
    assert texts.error_reference("err_<script>") is None


def test_hello_mentions_the_reference_escaped():
    assert "<code>abc-1</code>" in texts.hello("en", "abc-1")
    assert "Hallo" in texts.hello("de", None)
    assert texts.lang("de-AT") == "de" and texts.lang("fa") == "en" and texts.lang(None) == "en"


def test_store_routes_replies_back():
    with tempfile.TemporaryDirectory() as tmp:
        store = Store(tmp)
        store.remember(1, 10, 99)
        assert store.customer_for(1, 10) == 99
        assert store.customer_for(1, 11) is None
        # Survives a restart.
        assert Store(tmp).customer_for(1, 10) == 99
