# Terms of use: selecao.net.br (Selecon, IBFC) and Instituto AOCP

Research for issue #29, which follows up on the "Terms of use" lines in
`docs/research/mid-sized-organizers.md` (branch `research/mid-sized-organizers`). Checked on 2026-11-23
against the sites themselves.

The question: does any of these sites publish terms of use, or another policy, that forbids automated
reading or commercial reuse of its competition list? The bot shows only title, organization and a link
back.

## Method

- Every request used `User-Agent: RadarConcursosBot/1.0 (+https://github.com/TheSupereor/concursoBot)`,
  one at a time with a 1 s pause, about 45 requests in total.
- No login, no account, no challenge solving. One path (`/painel` on `selecon.selecao.net.br`) answered
  with a Cloudflare "Just a moment..." challenge; I stopped there. That path is disallowed in robots.txt
  anyway and is the candidate area, not the public list.
- For each site I read the footer and menu links, robots.txt, the sitemap when one exists, and probed the
  usual paths (`/termos`, `/termos-de-uso`, `/politica`, `/politica-de-privacidade`, `/privacidade`).
- A "Todos os direitos reservados" footer is a copyright notice. It is not a term on automated access,
  and it does not cover facts such as a competition's title, organization and dates. I record it but do
  not count it as a prohibition.

## Summary

| Site                                                           | Terms of use                            | Policy found                                                                                               | Clause on automated access or reuse | Verdict |
| -------------------------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------- | ------- |
| `selecao.net.br` platform (Selecon RJ, Selecon MT, IBFC hosts) | none found                              | per-competition "Termos e Condições" for candidates (`/termo/{id}/`)                                       | none                                | silent  |
| Selecon (`selecon.org.br`)                                     | none found                              | none (code of conduct and integrity programme PDFs only)                                                   | none                                | silent  |
| IBFC (`www.ibfc.org.br`)                                       | none found                              | https://www.ibfc.org.br/menus/privacidade.html                                                             | none                                | silent  |
| Instituto AOCP (`www.institutoaocp.org.br`)                    | none found (referred to, not published) | https://www.institutoaocp.org.br/politicas/privacidade, https://www.institutoaocp.org.br/politicas/cookies | none                                | silent  |

None of the four forbids automated reading or commercial reuse. None grants it explicitly either.

---

## selecao.net.br platform

Hosts checked: `selecon.selecao.net.br`, `selecon-mt.selecao.net.br`, `ibfc.selecao.net.br`, plus the
bare `selecao.net.br` and `www.selecao.net.br`.

- **Platform root:** `https://selecao.net.br/` and `https://www.selecao.net.br/` answer 200 with the
  single line "Cliente não encontrado." ("client not found"). The platform has no public home page,
  terms or operator identification of its own.
- **Footer and menu links** on `/index/abertos/` and `/informacoes/{id}/`: only the list routes
  (`/index/1/`, `/index/3/` etc.), `/faleconosco/`, `/painel`, and the client's own site. No terms or
  privacy link. Footers read "©2023 - Instituto Nacional de Seleção e Concursos | Todos os direitos
  reservados." (Selecon) and "2022 © IBFC - Todos os direitos reservados" (IBFC).
- **Probed paths:** `/termos/`, `/termos-de-uso/`, `/politica/`, `/privacidade/`,
  `/politica-de-privacidade/` and `/sitemap.xml` all return 404 on `selecon.selecao.net.br`;
  `/termos-de-uso/`, `/politica-de-privacidade/` and `/sitemap.xml` return 404 on `ibfc.selecao.net.br`.
  robots.txt declares `Sitemap: https://selecon.selecao.net.br/sitemap.xml`, but that URL is a 404.
- **robots.txt** (both hosts): disallows only `/admin/*`, `/painel/*`, `/uploads/*`.
- **"Termos e Condições":** each detail page links to `/termo/{id}/` (for example
  https://selecon.selecao.net.br/termo/73/ and https://ibfc.selecao.net.br/termo/497/). This is the
  candidate's registration declaration, accepted with a checkbox before signing up. It covers acceptance
  of the edital and LGPD consent for publishing the candidate's name and marks, for example "autorizando
  expressamente a divulgação do meu nome, número de inscrição e notas" (Selecon; the candidate
  authorises publication of their own name, registration number and marks). Nothing about site use,
  automated access or reuse, and it binds only registering candidates.
- **Verdict: silent.**

## Selecon (selecon.org.br)

- **Footer and menu:** links to `/a-instituicao/`, `/concursos/`, `/contato/`, `/fale-conosco/`, a
  code of conduct PDF (`/wp-content/uploads/2025/11/Selecon-codigo-de-conduta_040425.pdf`) and an
  integrity programme PDF (`/wp-content/uploads/2026/07/Programa-de-Integridade-Selecon.pdf`). The only
  rights text is the "Todos os direitos reservados" footer. No terms or privacy link.
- **Sitemap:** `/sitemap_index.xml` (also served at `/sitemap.xml` and `/wp-sitemap.xml`) lists
  `page-sitemap.xml` and two `concursos` sitemaps. The page sitemap has 14 pages: home, fale-conosco,
  contato, numero-de-protocolo, canal-de-denuncias, a-instituicao, apresentacao, ampla-experiencia,
  estrutura, objetivo, and a few test pages. No terms or privacy page.
- **WordPress API:** `/wp-json/wp/v2/pages?search=privacidade` and `?search=termos` both return `[]`;
  the full page list matches the sitemap.
- **Probed paths:** `/termos/`, `/termos-de-uso/`, `/politica/`, `/privacidade/`,
  `/politica-de-privacidade/` all 404.
- **robots.txt:** disallows only `/wp-admin/` (allows `admin-ajax.php`).
- I did not read the code of conduct or integrity PDFs; by their titles they govern the institute's own
  staff and suppliers, not site visitors.
- **Verdict: silent.**

## IBFC (www.ibfc.org.br)

- **Footer and menu** of `/menus/home.html`: home, quem_somos, parceiros, orcamento, the
  `ibfc.selecao.net.br` lists, `ibfcsocial.org.br`, the IBGE registration system, and
  `/menus/privacidade.html`. Footer: "2026 © IBFC - Todos os direitos reservados".
- **Privacy policy:** https://www.ibfc.org.br/menus/privacidade.html, "Política de Privacidades e
  Cookies". It covers the personal data of candidates (collection, processing, storage, deletion) and
  cookies. The only mention of copying is IBFC's own duty to guard stored data against "acesso,
  divulgação, cópia, uso ou modificação não autorizados" (IBFC protects the data it stores from
  unauthorised access or copying). It has no clause on visitors' automated access or reuse of site
  content.
- **Probed paths:** `/sitemap.xml`, `/termos.html`, `/menus/termos.html`, `/menus/termos_de_uso.html`,
  `/menus/politica.html` all return 403. The site is an S3 bucket behind CloudFront, which answers 403 for
  keys that do not exist (the earlier pass showed even `/` and `/robots.txt` do this, while
  `/menus/home.html` is 200), so these 403s mean "no such page", not a block.
- **Verdict: silent.**

## Instituto AOCP (www.institutoaocp.org.br)

- **Footer and menu:** "Política de privacidade" (`/politicas/privacidade`), "Política de cookies"
  (`/politicas/cookies`), "Direitos do titular de dados" (`/lgpd/direitos-do-titular`) and a cookie
  preferences button. No terms-of-use link.
- **How the policy page renders:** the earlier pass said the privacy page renders on the client. It does
  not: the page chunk `app/politicas/privacidade/page-49bca733d14bc55a.js` is 219 bytes and only loads
  a shared module, so the page is a Next.js server component. The full policy text is in the HTML the
  server sends (I read it as text after stripping tags). The shared chunks (`layout`, `30`, `337`, `878`,
  `972`) contain no "termos de uso", "termos e condições", scraping or reproduction strings, and no
  `/api/` call that serves page content.
- **Privacy policy** (https://www.institutoaocp.org.br/politicas/privacidade): covers personal data under
  the LGPD (controller, data collected, purposes, sharing, retention, data-subject rights, DPO contact).
  It twice refers to terms that the site does not publish: AOCP may send notice of "alterações de nossos
  termos, condições e políticas" and may use data "para aplicar nossos termos e condições" (to enforce
  our terms and conditions). No clause on automated access, scraping, reproduction or commercial reuse.
- **Cookie policy** (https://www.institutoaocp.org.br/politicas/cookies): categories of cookies, third
  parties (Google, Meta), how to withdraw consent. Nothing on automated access.
- **Probed paths:** `/termos`, `/termos-de-uso`, `/politicas/termos`, `/politicas/termos-de-uso`,
  `/sitemap.xml` and `/robots.txt` all 404.
- **Verdict: silent.** The "termos e condições" the privacy policy refers to are not published anywhere
  I could reach.

## What this means for the bot

- Nothing found forbids reading these lists automatically or showing title, organization and a link
  back in a paid product. Robots.txt on every list host allows the list paths (AOCP has none, which means
  allowed).
- Keep away from `/painel/*`, `/admin/*` and `/uploads/*` on `selecao.net.br`, and never touch the
  candidate area (Cloudflare-protected).
- The "Todos os direitos reservados" footers cover the sites' own creative content. Showing only
  factual fields plus a link back, as the bot does, does not copy that content.

## Not verified

- Whether AOCP's unpublished "termos e condições" exist behind a login (for example in the candidate
  area or on `link.institutoaocp.org.br`). I did not log in.
- Who operates `selecao.net.br`; the platform names no operator and publishes no terms of its own.
- The contents of the Selecon code of conduct and integrity programme PDFs.
- The editais (PDFs) themselves, which might carry their own reproduction notes.
- This is a reading of published documents, not legal advice.
