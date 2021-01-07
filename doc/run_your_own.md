# Run your own Fritz

Clone the repo from `GitHub`:
```bash
git clone --recursive https://github.com/fritz-marshal/fritz.git && cd fritz
```

All operations are started via the `fritz` script.

Before proceeding, you may want to create/activate a virtual environment, for example:

```bash
python -m venv fritz-env
source fritz-env/bin/activate
```

Make sure the requirements to run it are met, e.g.:

```bash
pip install -r requirements.txt
```

Please type `./fritz --help` to see available commands.

## Configuration

The `fritz.yaml` file should contain settings for the marshal, including a
secret token (which must be customized before deployment), and
authentication tokens.
Please use the `fritz.defaults.yaml` file for the reference.

## Initializing Fritz

Before Fritz is launched for the first time, it needs to be initialized:

```
./fritz run --init
```

## Demo data

To load demo data into Fritz, run:

```
./fritz test
```

If you are using the default settings, go to `http://localhost:5000/` --
you should see a few real alerts that passed test filters among the displayed sources.

## Launching Fritz

```
./fritz run
```

## Shutting down Fritz

```bash
./fritz stop
```
