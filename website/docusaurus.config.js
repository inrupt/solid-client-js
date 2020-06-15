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
  title: "lit-solid",
  tagline: pkg.description,
  url: "https://inrupt.github.io",
  baseUrl: process.env.CI ? "/lit-solid/" : "/",
  favicon: "img/favicon.ico",
  organizationName: "inrupt", // Usually your GitHub org/user name.
  projectName: "lit-solid", // Usually your repo name.
  themeConfig: {
    announcementBar: {
      id: "alpha-warning", // Any value that will identify this message.
      content:
        "Both lit-solid and this website are still in alpha. Expect things to break.",
      backgroundColor: "#ffba00", // Defaults to `#fff`.
      textColor: "#091E42", // Defaults to `#000`.
    },
    prism: {
      // This is the included theme that least de-emphasises comments:
      theme: prismTheme,
    },
    navbar: {
      title: "lit-solid",
      // logo: {
      //   alt: "My Site Logo",
      //   src: "img/logo.svg",
      // },
      links: [
        {
          to: "docs/",
          activeBasePath: "docs",
          label: "Getting Started",
          position: "left",
        },
        {
          to: "docs/api/index",
          activeBasePath: "docs/api/index",
          label: "API Reference",
          position: "left",
        },
        {
          href: "https://github.com/inrupt/lit-solid",
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
              href: "https://github.com/inrupt/lit-solid",
            },
            {
              label: "Report a bug",
              href: "https://github.com/inrupt/lit-solid/issues",
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
          editUrl: "https://github.com/inrupt/lit-solid/edit/master/website/",
        },
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
      },
    ],
  ],
};
