import { Bungee_Inline } from "next/font/google"

const bungee = Bungee_Inline({ weight: "400", subsets: ['latin']})

/** @type {import('nextra-theme-docs').DocsThemeConfig} */
export default {
  useNextSeoProps() {
    return {
      titleTemplate: '%s – Submodule 🚀'
    }
  },
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta property="og:title" content="Submodule" />
      <meta property="og:description" content="Composable submodule" />
    </>
  ),
  logo: <span className={bungee.className} style={{ fontSize: '2rem', color: '#F95738'}}>Submodule</span>,
  project: {
    link: 'https://github.com/submodule-js/submodule'
  },
  editLink: { text: null },
  feedback: { content: null },
  footer: {
    text: <span>
      MIT {new Date().getFullYear()} © <a href="https://submodule.io" target="_blank">SubmoduleJS</a>.
    </span>,
  },
  primaryHue: 27
}