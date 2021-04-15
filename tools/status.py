from contextlib import contextmanager
import sys
import io


@contextmanager
def redirect_std(out):
    """
    Contextmanager to temporarily redirect stdout toa StringIO object.

    """
    sys.stdout.flush()
    stdout = sys.stdout
    try:
        sys.stdout = out
        yield
    finally:
        sys.stdout = stdout


@contextmanager
def status(message, quiet=True):
    print(f"[·] {message}", end="")

    fake_stdout = io.StringIO()

    try:
        with redirect_std(fake_stdout):
            yield
    except Exception:
        print(f"\r[✗] {message}")

        fake_stdout.seek(0)
        out = fake_stdout.read().strip()
        if out:
            print("-- captured output --")
            print(out)
            print("-- end output --")

        raise
    else:
        print(f"\r[✓] {message}")
