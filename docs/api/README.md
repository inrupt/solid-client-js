# apidocs

Builds the API docs site from generated api \*.md files.

## To Build

To build:

0. Prereq: [python3](https://www.python.org/downloads/), [Node.js](https://nodejs.org/).

1. Optional but recommended. Create a virtual env:

   ```sh
   python3 -m venv <path to the new virtual environment>
   source <path to the new virtual environment>/bin/activate
   ```

1. Generate the API .md files:

   npm ci; npm run build-api-docs

1. Go to the directory for API docs:

   cd docs/api

1. Install the docs requirements (different from library docs requirements):

   ```sh
   pip install -r requirements.txt
   ```

1. Make the API docs:

   ```sh
   make html
   ```

   There should be a `build/html` directory with the html artifacts.

When finished, can deactivate your virtual env.

## Third Party Licenses

The `requirements.txt` lists the 3rd party libraries used for the docs.
For the licenses, see the shared
[inrupt/docs-assets](https://github.com/inrupt/docs-assets#readme).
