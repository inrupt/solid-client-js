# Configuration file for the Sphinx documentation builder.
#
# This file only contains a selection of the most common options. For a full
# list see the documentation:
# https://www.sphinx-doc.org/en/master/usage/configuration.html

# -- Path setup --------------------------------------------------------------

# If extensions (or modules to document with autodoc) are in another directory,
# add these directories to sys.path here. If the directory is relative to the
# documentation root, use os.path.abspath to make it absolute, like shown here.
#
# import os
# import sys
# sys.path.insert(0, os.path.abspath('.'))

# -- Project information -----------------------------------------------------

copyright = '2020-present, Inrupt Inc.'

# -- General configuration ---------------------------------------------------


# -- product name -----
# -- Separately update code samples and toc links and docs-navbar since not using substitutions--

name = 'solid-client'
repo_name = '{0}-js'.format(name)

pygments_style = 'sphinx'

# -- Using .txt instead of .rst for restructured text -----------------------
source_suffix = {
    '.rst': 'restructuredtext',
    '.md': 'markdown',
}

# -- Add lexers
from sphinx.highlighting import lexers

highlight_language = 'javascript'

# Add any Sphinx extension module names here, as strings. They can be
# extensions coming with Sphinx (named 'sphinx.ext.*') or your custom
# ones.
extensions = [
    'sphinx.ext.extlinks',
    'myst_parser',
]


# Add any paths that contain templates here, relative to this directory.
templates_path = ['./_templates']

# List of patterns, relative to source directory, that match files and
# directories to ignore when looking for source files.
# This pattern also affects html_static_path and html_extra_path.
exclude_patterns = [ ]

# -- Options for HTML output -------------------------------------------------

# The theme to use for HTML and HTML Help pages.  See the documentation for
# a list of builtin themes.
#
#html_theme = 'alabaster'

html_theme = 'inrupt'
html_theme_path = ['./themes']

html_copy_source = False

html_title = 'Inrupt {0} Documentation'.format(name)

# These theme options are declared in ./themes/inrupt/theme.conf

html_theme_options = {
    'project_title': 'Inrupt {0} API Documentation'.format(name),
    'banner': True,
    'banner_msg': 'All libraries and documentation are currently in Beta. Content and features are subject to change.',
    'robots_index': True,
    'github_editable': False,
    'github_org': 'inrupt',
    'github_repo': repo_name,
    'github_branch': 'master',
    'ess_docs': 'https://docs.inrupt.com/ess/',
    'clientlibjs_docs': 'https://docs.inrupt.com/developer-tools/javascript/client-libraries/',
    'reactsdk_docs': 'https://docs.inrupt.com/developer-tools/javascript/react-sdk',
}

# Add any paths that contain custom static files (such as style sheets) here,
# relative to this directory. They are copied after the builtin static files,
# so a file named "default.css" will overwrite the builtin "default.css".
html_static_path = ['_static']

html_sidebars = {
    '**': ['docs-sidebar.html'],
}

locale_dirs = ['locale/']   # path is example but recommended.
gettext_compact = False     # optional.
