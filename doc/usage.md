# Spin up your own Fritz

All operations are started via the `fritz` script. Please type
`./fritz --help` to see available commands.

## Configuration

The `fritz.yaml` file contains settings for the marshal, including a
secret token (which must be customized before deployment), and
authentication tokens.

## Initializing Fritz

Before Fritz is launched for the first time, it needs to be initialized:

```
./fritz run --init
```

## Launching Fritz

```
./fritz run
```
