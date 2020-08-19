# Minimal makefile for Sphinx documentation
#

# You can set these variables from the command line, and also
# from the environment for the first two.
SPHINXBUILD   ?= sphinx-build
SOURCEDIR     = source
GIT_BRANCH    :=$(shell git rev-parse --abbrev-ref HEAD)
BUILDDIR      = build
SPHINXOPTS    = -d $(BUILDDIR)/doctrees -W -c .
SOURCECOPYDIR = $(BUILDDIR)/source/

# Put it first so that "make" without argument is like "make help".
help:
	@$(SPHINXBUILD) -M help "$(SOURCECOPYDIR)" "$(BUILDDIR)" $(SPHINXOPTS) $(O)

.PHONY: help clean Makefile migrate html 

clean:
	if [ -d $(BUILDDIR) ]; then rm -rf $(BUILDDIR) ; fi;

migrate: clean
	mkdir -p $(SOURCECOPYDIR)

   # Copying to SOURCECOPYDIR instead of copying source dir to BUILDDIR
   # in case someone forgets to backslash after build/

	cp -R $(SOURCEDIR)/* $(SOURCECOPYDIR)

html: Makefile migrate

	@$(SPHINXBUILD) -M $@ "$(SOURCECOPYDIR)" "$(BUILDDIR)" $(SPHINXOPTS) $(O) 

# Catch-all target: route all unknown targets to Sphinx using the new
# "make mode" option.  $(O) is meant as a shortcut for $(SPHINXOPTS).
%: Makefile migrate
	@$(SPHINXBUILD) -M $@ "$(SOURCECOPYDIR)" "$(BUILDDIR)" $(SPHINXOPTS) $(O)

