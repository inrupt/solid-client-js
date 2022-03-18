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

2. Install the dependencies:

   ```sh
   npm ci
   npm run docs:install
   ```

3. Generate the docs source files and build the site:

   ```sh
   npm run docs:build
   ```

4. If you want to preview the docs site, you can use:

   ```sh
   npm run docs:preview
   ```

5. If you'd like to clean the generated docs and start fresh, you can use:

   ```sh
   npm run docs:clean
   ```

When finished, can deactivate your virtual env.

## Third Party Licenses

The `requirements.txt` lists the 3rd party libraries used for the docs.
For the licenses, see the shared
[inrupt/docs-assets](https://github.com/inrupt/docs-assets#readme).
