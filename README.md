# fritz

Frontend for Reviewing Interesting Transients from ZTF-II

## Bare-bones end-to-end demo

Clone the repo from `GitHub`, pull the submodules (`skyportal` and `kowalski`), and make the `fritz` utility executable:
```bash
git clone https://github.com/fritz-marshal/fritz.git && cd fritz
git submodule update --init
chmod 755 fritz
```

Initialize `fritz` and run tests:

```bash
./fritz run --init
./fritz test
```