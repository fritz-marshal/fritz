#!/usr/bin/env python
from distutils.version import LooseVersion as Version
import subprocess
import pathlib
import pkg_resources

from .status import status


def output(cmd):
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    out, err = p.communicate()
    success = p.returncode == 0
    return success, out


system_dependencies = {
    "python": (
        # Command to get version
        ["python", "--version"],
        # Extract *only* the version number
        lambda v: v.split()[1],
        # It must be >= 3.7
        "3.7",
    ),
    "docker": (
        # Command to get version
        ["docker", "--version"],
        # Extract *only* the version number
        lambda v: v.split()[2][:-1],
        # It must be >= 18.06
        "18.06",
    ),
    "docker-compose": (
        # Command to get version
        ["docker-compose", "--version"],
        # Extract *only* the version number
        lambda v: v.split()[2][:-1],
        # It must be >= 1.22.0
        "1.22.0",
    ),
}


def get_python_requirements(
    requirements_path: pathlib.Path = pathlib.Path(__file__).parent.parent.absolute(),
    requirements_file_name: str = "requirements.txt",
    requirements: list = [],
):
    """Recursively get python requirements from requirements.txt-like files"""
    with open(requirements_path / requirements_file_name) as requirements_file:
        requirements_from_file = requirements_file.read().splitlines()
    for requirement in requirements_from_file:
        if requirement.startswith("-r"):
            get_python_requirements(
                requirements_path=requirements_path,
                requirements_file_name=requirement.split()[1],
            )
        else:
            requirements.append(requirement)

    return list(set(requirements))


def dependencies_ok(check_python_requirements: bool = True):
    print("Checking system dependencies:")

    unsatisfied_system_dependencies = []

    for dep, (cmd, get_version, min_version) in system_dependencies.items():
        try:
            query = f"{dep} >= {min_version}"
            with status(query):
                success, out = output(cmd)
                try:
                    version = get_version(out.decode("utf-8").strip())
                    print(f"[{version.rjust(8)}]".rjust(40 - len(query)), end="")
                except Exception:
                    raise ValueError("Could not parse version")

                if not (Version(version) >= Version(min_version)):
                    raise RuntimeError(f"Required {min_version}, found {version}")
        except ValueError:
            print(
                f"\n[!] Sorry, but our script could not parse the output of "
                f'`{" ".join(cmd)}`; please file a bug, or see '
                f"`check_app_environment.py`\n"
            )
            raise
        except Exception as e:
            unsatisfied_system_dependencies.append((dep, e))

    if unsatisfied_system_dependencies:
        print()
        print("[!] Some system dependencies seem to be unsatisfied")
        print()
        print("    The failed checks were:")
        print()
        for (pkg, exc) in unsatisfied_system_dependencies:
            cmd, get_version, min_version = system_dependencies[pkg]
            print(f'    - {pkg}: `{" ".join(cmd)}`')
            print("     ", exc)
        print()
        print(
            "    Please refer to https://docs.fritz.science "
            "for installation instructions."
        )
        print()

    unsatisfied_python_requirements = []
    if check_python_requirements:
        print("\nChecking python requirements:")

        for requirement in get_python_requirements():
            try:
                with status(requirement):
                    pkg_resources.require(requirement)
            except (
                pkg_resources.DistributionNotFound,
                pkg_resources.VersionConflict,
            ) as e:
                unsatisfied_python_requirements.append(e.report())

        if unsatisfied_python_requirements:
            print()
            print("[!] Some python package requirements seem to be unsatisfied")
            print()
            print("    The failed requirements were:")
            print()
            for requirement in unsatisfied_python_requirements:
                print(requirement)
            print()
            print(
                "    Please refer to https://docs.fritz.science "
                "for installation instructions."
            )
            print()

    if unsatisfied_system_dependencies:
        return False

    if unsatisfied_python_requirements:
        attempt_resolving = input(
            "Would you like to attempt resolving unsatisfied "
            "python package requirements in your current environment? [y/N] "
        ).lower()
        if attempt_resolving in ("y", "yes", "yup", "yea", "yeah"):
            p = subprocess.run(
                [
                    "python",
                    "-m",
                    "pip",
                    "install",
                    "-r",
                    pathlib.Path(__file__).parent.parent.absolute()
                    / "requirements.txt",
                ],
                check=True,
            )
            if p.returncode != 0:
                print("\nAttempt failed.\n")
                return False
        else:
            return False

    print("-" * 20)
    return True


if __name__ == "__main__":
    dependencies_ok()
