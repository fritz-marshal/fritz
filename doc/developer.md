# Developer Guidelines

## How to contribute

Contributions to Fritz are made through [GitHub Pull Requests](https://help.github.com/en/github/collaborating-with-issues-and-pull-requests/about-pull-requests), a set of proposed commits (or patches).

To prepare, you should:

- Create your own fork the [fritz repository](https://github.com/fritz-marshal/fritz) by clicking the "fork" button.

- [Set up SSH authentication with GitHub](https://help.github.com/en/github/authenticating-to-github/connecting-to-github-with-ssh).

- Clone (download) your copy of the repository, and set up a remote called `upstream` that points to the main Fritz repository.

  ```sh
  git clone git@github.com:yourname/fritz
  git remote add upstream git@github.com:fritz-marshal/fritz
  ```

Then, for each feature you wish to contribute, create a pull request:

1. Download the latest version of Fritz, and create a new branch for your work.

   Here, let's say we want to contribute some documentation fixes; we'll call our branch `rewrite-contributor-guide`.

   ```sh
   git checkout master
   git pull upstream master
   git checkout -b rewrite-contributor-guide
   ```

1. Make modifications to Fritz and commit your changes using `git add` and `git commit`.  Each commit message should consist of a summary line and a longer description, e.g.:

   ```text
   Rewrite the contributor guide

   While reading through the contributor guide, I noticed several places
   in which instructions were out of order. I therefore reorganized all
   sections to follow logically, and fixed several grammar mistakes along
   the way.
   ```

1. When ready, push your branch to GitHub:

   ```sh
   git push origin rewrite-contributor-guide
   ```

   Once the branch is uploaded, GitHub should print a URL for turning your branch into a pull request.  Open that URL in your browser, write an informative title and description for your pull request, and submit it.

1. The Fritz will now review your contribution, and suggest changes.  *To simplify review, please limit pull requests to one logical set of changes.* To incorporate changes recommended by the reviewers, commit edits to your branch, and push to the branch again (there is no need to re-create the pull request, it will automatically track modifications to your branch).

1. Once the pull request has been reviewed and approved by at least two team members, it will be merged into Fritz.

## Setting up your environment

We use flake8 to verify that code complies with [PEP8](https://www.python.org/dev/peps/pep-0008/).  Please install the git pre-commit hook using:

```sh
./fritz developer
```

The pre-commit hook will lint *changes* made to the source.  To lint
the entire repository, use:

```sh
./fritz lint
```
