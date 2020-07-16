from contextlib import contextmanager
import sys


@contextmanager
def status(message):
    print(f'[·] {message}', end='')
    sys.stdout.flush()
    try:
        yield
    except Exception:
        print(f'\r[✗] {message}')
        raise
    else:
        print(f'\r[✓] {message}')
