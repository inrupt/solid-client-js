/**
 * Copyright 2020 Inrupt Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
 * Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

const pkg = require("../package.json");

const prismTheme = require("prism-react-renderer/themes/github");
prismTheme.styles = prismTheme.styles.map((style) => {
  if (!style.types.includes("comment")) {
    return style;
  }

  return {
    ...style,
    style: {
      ...style.style,
      color: "#008500",
    },
  };
});

module.exports = {
  title: "lit-pod",
  tagline: pkg.description,
  url: "https://inrupt.github.io",
  baseUrl: process.env.CI ? "/lit-pod/" : "/",
  favicon: "img/favicon.ico",
  organizationName: "inrupt", // Usually your GitHub org/user name.
  projectName: "lit-pod", // Usually your repo name.
  themeConfig: {
    announcementBar: {
      id: "alpha-warning", // Any value that will identify this message.
      content:
        "Both lit-pod and this website are still in alpha. Expect things to change.",
      // Same as --ifm-color-warning in custom.css:
      backgroundColor: "#ffa600", // Defaults to `#fff`.
      textColor: "#000", // Defaults to `#000`.
    },
    prism: {
      // This is the included theme that least de-emphasises comments:
      theme: prismTheme,
    },
    navbar: {
      title: "lit-pod",
      // logo: {
      //   alt: "My Site Logo",
      //   src: "img/logo.svg",
      // },
      links: [
        {
          to: "docs/",
          activeBaseRegex: "docs/$",
          label: "Getting Started",
          position: "left",
        },
        {
          to: "docs/guide/installation",
          activeBasePath: "docs/guide/",
          label: "Guide",
          position: "left",
        },
        {
          to: "docs/api/index",
          activeBasePath: "docs/api/",
          label: "API Reference",
          position: "left",
        },
        {
          href: "https://github.com/inrupt/lit-pod",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Docs",
          items: [
            {
              label: "Getting started",
              to: "docs/",
            },
            {
              label: "Guide",
              to: "docs/guide/installation",
            },
            {
              label: "API Reference",
              to: "docs/api/index",
            },
          ],
        },
        {
          title: "Solid",
          items: [
            {
              label: "Project website",
              href: "https://solidproject.org/",
            },
            {
              label: "Inrupt",
              href: "https://inrupt.com",
            },
            {
              label: "Community",
              href: "https://forum.solidproject.org/",
            },
            {
              label: "Twitter",
              href: "https://twitter.com/project_solid",
            },
          ],
        },
        {
          title: "More",
          items: [
            {
              label: "Source code",
              href: "https://github.com/inrupt/lit-pod",
            },
            {
              label: "Report a bug",
              href: "https://github.com/inrupt/lit-pod/issues",
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Inrupt, Inc.`,
    },
  },
  presets: [
    [
      "@docusaurus/preset-classic",
      {
        docs: {
          // It is recommended to set document id as docs home page (`docs/` path).
          homePageId: "getting-started",
          sidebarPath: require.resolve("./sidebars.js"),
          // Please change this to your repo.
          editUrl: "https://github.com/inrupt/lit-pod/edit/master/website/",
        },
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
      },
    ],
  ],
};
