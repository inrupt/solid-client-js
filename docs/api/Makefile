# Minimal makefile for Sphinx documentation
#

# You can set these variables from the command line, and also
# from the environment for the first two.
SPHINXBUILD   ?= sphinx-build
SOURCEDIR     = source
GIT_BRANCH    :=$(shell git rev-parse --abbrev-ref HEAD)
BUILDDIR      = build
SPHINXOPTS    = -d $(BUILDDIR)/doctrees -W 
SOURCECOPYDIR = $(BUILDDIR)/source/

# Will need later for scrubbing generated .md files
MY_OS         :=$(shell uname)
# In Makefile, spaces and everything count inside if parens()
ifeq ($(MY_OS),Darwin)
	IS_MAC="DEFINED"
endif

.PHONY: Makefile help check clean clean-all prepare html dist

check:
  $(if $(shell command -v $(SPHINXBUILD) 2> /dev/null),$(info Found `$(SPHINXBUILD)`),$(error sphinx-build is not available, please follow the instructions in ./docs/api/README.md))

# Put it first so that "make" without argument is like "make help".
help: check
	@$(SPHINXBUILD) -M help "$(SOURCECOPYDIR)" "$(BUILDDIR)" $(SPHINXOPTS) $(O)

clean:
	if [ -d $(BUILDDIR) ]; then rm -rf $(BUILDDIR) ; fi;
	if [ -d ../dist ]; then rm -rf ../dist ; fi;

# clean-all has to be separate from clean as prepare depends on clean,
# but prepare also expects the typedoc build output to exist in source/api
clean-all: clean	
	if [ -d docs-assets ]; then rm -rf docs-assets ; fi;
	if [ -d source/api ]; then rm -rf source/api ; fi;

prepare: clean
	if [ ! -d docs-assets ]; then git clone https://github.com/inrupt/docs-assets.git docs-assets; fi;
# Copying to SOURCECOPYDIR instead of copying source dir to BUILDDIR
# in case someone forgets to backslash after build/
# Copying source/api/* to BUILDDIR.
	mkdir -p $(SOURCECOPYDIR)
	cp -R $(SOURCEDIR)/index.rst $(SOURCECOPYDIR)
	cp -R $(SOURCEDIR)/api/* $(SOURCECOPYDIR)
# Note: remove the typedoc generated `index.md` since we use a custom index.rst instead
	rm $(SOURCECOPYDIR)/index.md

html: Makefile check prepare
	@$(SPHINXBUILD) -M $@ "$(SOURCECOPYDIR)" "$(BUILDDIR)" $(SPHINXOPTS) $(O) -c .

dist: html
	if [ -d ../dist ]; then rm -r ../dist; fi;
	mkdir -p ../dist
	cp -R $(BUILDDIR)/html/. ../dist/

# Catch-all target: route all unknown targets to Sphinx using the new
# "make mode" option.  $(O) is meant as a shortcut for $(SPHINXOPTS).
%: Makefile check prepare
	@$(SPHINXBUILD) -M $@ "$(SOURCECOPYDIR)" "$(BUILDDIR)" $(SPHINXOPTS) $(O) -c .
