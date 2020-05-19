# fritz

Frontend for Reviewing Interesting Transients from ZTF-II

## Bare-bones end-to-end demo

Clone the repo from `GitHub`:
```bash
git clone https://github.com/fritz-marshal/fritz.git && cd fritz
```

Make sure the requirements to run the `fritz` utility are met, e.g.:

```bash
pip install -r requirements_api.txt --no-cache-dir
``` 

Initialize `fritz` and run tests:

```bash
./fritz run --init
./fritz test
```

Go to `http://localhost:9000/` -- you should see a few real alerts that passed a test filter among the displayed sources.

To shut down `fritz`, run:

```bash
./fritz stop
```
