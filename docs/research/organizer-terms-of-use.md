# Organizers' terms of use and automated reading

Research for issue #24. Checked on 2026-11-23.

## Question

Do the published terms of Cebraspe, Cesgranrio and FGV (terms of use, privacy policy, copyright
notices) allow an identified bot to read their competition listings automatically, for a paid alert
service that shows only the title, the organization and a link back to the organizer?

## Method

- Only the organizers' own sites were read. No account was created and no block was worked around.
- Every request used the project's identifying User-Agent
  `RadarConcursosBot/1.0 (+https://github.com/TheSupereor/concursoBot)`, with about 2 seconds between
  requests (about 50 requests in total over the three organizers).
- Policy pages were found from each site's footer links, its sitemap and, for the WordPress sites, the
  site search. Policy PDFs were read in full or searched for: `automat*`, `robô`, `scrap*`, `crawl*`,
  `reprodu*`, `comercial`, `propriedade`, `termos de uso`, `não-humano`.
- Quotes are short excerpts in Portuguese, each followed by an English paraphrase.

This is a reading of the published documents, not legal advice. General Brazilian law (copyright,
consumer or unfair-competition rules) was not researched.

## Summary

| Organizer  | Terms of use found                                             | Automated access | Commercial reuse                       | robots.txt for the paths read     | Identifying User-Agent | Verdict       |
| ---------- | -------------------------------------------------------------- | ---------------- | -------------------------------------- | --------------------------------- | ---------------------- | ------------- |
| Cebraspe   | None. Only a privacy policy (2022).                            | Not mentioned    | Not mentioned (for the site's content) | Site: allows all. API host: none. | Accepted (HTTP 200)    | **Silent**    |
| Cesgranrio | None. Only a privacy policy.                                   | Not mentioned    | Not mentioned                          | None (404)                        | Accepted (HTTP 200)    | **Silent**    |
| FGV        | Yes: Terms of Use of the FGV Conhecimento platform (Jan 2026). | **Forbidden**    | **Forbidden** outside the terms        | `/concursos` is not disallowed    | Accepted (HTTP 200)    | **Forbidden** |

**Cebraspe, already implemented, is not forbidden by anything it publishes.** No clause found forbids
it; none grants it either.

**FGV forbids it.** Its terms, linked from the footer of the competitions page itself, forbid
automated tools and commercial exploitation. `robots.txt` allowing the path does not override that.

## Cebraspe

Sources:

- Site: <https://www.cebraspe.org.br/> (WordPress). The listing pages `/concursos/novos`,
  `/concursos/inscricoes-abertas/` and `/concursos/em-andamento/` are filled from the API below.
- API used by the code: `https://apis.cebraspe.org.br/cebraspe/eventos/tipo/concursos/fase/<phase>`.
- Privacy policy: Resolução RDG n.º 1/2022, "Política de Privacidade do Cebraspe",
  <https://cdn.cebraspe.org.br/wp-content/uploads/2022/06/Resolucao-da-Diretoria-Geral-RDG-n.o-1_2022_Politica-de-Privacidade-do-Cebraspe.pdf>,
  linked from <https://www.cebraspe.org.br/transparencia/>. The LGPD page
  <https://www.cebraspe.org.br/lgpd/> only names the data protection officer.

Where terms of use were looked for, with none found:

- The home page footer and links (only a `© 2019, Cebraspe.` notice; no terms or privacy link).
- The page sitemap <https://www.cebraspe.org.br/page-sitemap.xml>: no page about terms, use or
  copyright; the only policy-like entry is `/lgpd/`.
- `/termos-de-uso/` and `/politica-de-privacidade/`: HTTP 404.
- The transparency page: links the privacy policy only.

Relevant clauses of the privacy policy:

- Section 12, "Termos de uso específicos": "prevalecerá o termo ou política mais restritiva".
  If a more specific term exists for a service, the stricter one wins. It refers to terms that may
  exist; none was found published.
- Section 13, "Áreas de uso restrito": restricted areas (intranet and internal systems) are for
  authorized people only, behind a login. The public listing and the API endpoint are not behind a
  login.
- Footer of the policy PDF: "Nenhuma parte dessa publicação pode ser copiado, reproduzido ou
  distribuído". No part of _this publication_ may be copied. It covers the policy document itself,
  not the competition listings.
- The policy covers personal data. It says nothing about automated access, scraping or reuse of the
  site's public content.

robots.txt:

- <https://www.cebraspe.org.br/robots.txt> (HTTP 200): `User-agent: *` with an empty `Disallow:`,
  which allows everything. (Its `Sitemap:` line points to a `homologacaoportal` host, a leftover.)
- <https://apis.cebraspe.org.br/robots.txt>: HTTP 404, so no rules for the API host.

User-Agent: accepted. The phase endpoint (`fase/novos`) returned HTTP 200 with JSON, and the site pages
returned HTTP 200. The API host root returned HTTP 403, an IIS "access denied" page for the bare
directory; the data endpoint on the same host answered 200 to the same User-Agent, so this is not a
bot block.

**Verdict: silent.** Nothing published forbids or allows automated reading or commercial reuse. The API
is undocumented and has no published license, so there is no grant to rely on either: the access is
tolerated, not authorized, and can be withdrawn without notice. See "What silent implies" below.

## Cesgranrio

Sources:

- Site: <https://www.cesgranrio.org.br/> (WordPress).
- Endpoint for the planned source: `https://www.cesgranrio.org.br/wp-json/wp/v2/concurso`, the standard
  WordPress REST API, which WordPress exposes publicly by default.
- Privacy pages: <https://www.cesgranrio.org.br/privacidade/> ("Privacidade & Cookies") and the policy
  at <https://www.cesgranrio.org.br/privacidade/politica/>.

Where terms of use were looked for, with none found:

- The home page footer: the only policy link is `/privacidade/`, plus the cookie consent banner.
- The page sitemap <https://www.cesgranrio.org.br/wp-sitemap-posts-page-1.xml> (15 pages): the only
  policy pages are `/privacidade/` and `/privacidade/politica/`.
- The site's page search (`/wp-json/wp/v2/pages?search=termos`): only the privacy policy.
- No copyright notice was found on the home page.

Relevant clauses of the privacy policy:

- Section 13: "outros Termos de Uso e Políticas específicas de privacidade podem estar previstas".
  Other specific terms may exist for certain services; the more specific one prevails. None was found
  for the site or the listings.
- Section 4.3, "Dados coletados de forma automatizada": about Cesgranrio's own cookies and analytics,
  not about visitors' automated access.
- Nothing about automated access, scraping or reuse of the site's content.

robots.txt: <https://www.cesgranrio.org.br/robots.txt> returned HTTP 404 (nginx), so there are no rules.
Without a file, the robots convention treats every path as allowed.

User-Agent: accepted. The home page and `/wp-json/wp/v2/concurso?per_page=1` returned HTTP 200 (JSON).

**Verdict: silent.** Same as Cebraspe. One point in its favor: the REST endpoint is a standard,
publicly advertised WordPress interface (the home page sends a `Link: <…/wp-json/>; rel="https://api.w.org/"`
header). That is still not a license to reuse the content.

## FGV

Sources:

- Listing read by the planned source: <https://conhecimento.fgv.br/concursos> (Drupal), part of the
  "Plataforma FGV Conhecimento".
- Terms of use: "Termos de Uso – Plataforma FGV Conhecimento", version 2.0 of 2026-01-16,
  <https://conhecimento.fgv.br/sites/default/files/2026.01.16-termos-de-uso-fgv-conhecimento.pdf>.
  Linked as "Termos de Uso" in the footer of the `/concursos` page itself.
- Privacy notice of the platform:
  <https://conhecimento.fgv.br/sites/default/files/2026.06.24-aviso-de-privacidade-fgv-conhecimento.pdf>
  (says it is read together with the terms; nothing about automated access).
- The main portal <https://portal.fgv.br/> links only a privacy notice
  (<https://portal.fgv.br/sites/default/files/avisos/2025.05.28-aviso-de-privacidade-portais-fgv.pdf>)
  and a "© 2026 FGV. Todos os direitos reservados." footer. `fgv.br/robots.txt` is 404; the
  competitions are not on `portal.fgv.br`, so its terms were not looked for further.

Relevant clauses of the terms of use:

- Scope, Presentation: the terms govern use of the platform at `https://conhecimento.fgv.br/`, and
  "Ao utilizar a Plataforma FGV Conhecimento, o(a) Usuário(a) declara ter lido". Using the platform
  counts as accepting the terms.
- Definitions: the user is "Qualquer pessoa que acesse, se cadastre e use a Plataforma"; "Acesso" is
  defined as accessing "e/ou" registering. Registration is not needed to be bound.
- Section 3.1, obligations: "Não utilizar ferramentas automatizadas e/ou que possam ser identificadas
  como geradoras de padrão [...]" (of non-human browsing). **Do not use automated tools, or anything
  that produces a non-human browsing pattern, on the platform.**
- Section 3.1, obligations: "não explorar o seu Acesso para fins comerciais alheios a estes Termos de
  Uso". Do not exploit access for commercial purposes outside these terms. The same item forbids
  reproducing, copying or selling any part of the platform.
- Section 2.3: FGV may suspend or block access where it detects "ferramentas automatizadas" with
  "padrões de acesso e requisição não-humanos". Automated access is a stated ground for blocking.
- Section 4.2: the license to use the platform is non-exclusive, revocable and for internal use;
  section 4.2.1 says no other license is granted.

robots.txt: <https://conhecimento.fgv.br/robots.txt> (HTTP 200) is Drupal's default. It disallows
admin, search, user and oembed paths; `/concursos` is not disallowed. robots.txt is a crawling
convention, not a license, and does not override the terms.

User-Agent: accepted. `/concursos` returned HTTP 200 with HTML.

**Verdict: forbidden.** The terms that cover the exact page we would read forbid automated tools and
commercial exploitation. A paid alert service fetching the listing on a schedule is both. Do not
implement the FGV source without written permission from FGV (the terms point to
<https://conhecimento.fgv.br/contato-0> for questions about them).

## What silent implies

For Cebraspe and Cesgranrio, no published document forbids the access, so there is no contractual
breach to point at, which is the reason PCI Concursos was dropped. It does not mean permission:

- Nothing grants a license to reuse the listings commercially, and either organizer can publish terms,
  block the User-Agent or change the endpoint at any time.
- The project's footprint is small and favorable: it identifies itself, requests rarely, shows only
  title, organization and a link that sends the reader to the organizer, and copies no notice text.
- Ways to reduce the risk: keep the identifying User-Agent and a low request rate; re-check these
  pages periodically (a weekly live check already exists for the source); stop on any 403 or new
  terms; and, for certainty, ask each organizer by email (Cebraspe through its contact page, Cesgranrio
  through `privacidade@cesgranrio.org.br` or its contact page) and keep the answer.

## Not verified

- Whether Cebraspe or Cesgranrio have terms published somewhere not linked from the footer, sitemap or
  site search (for example inside a candidate area behind a login, which was not entered).
- Whether either organizer considers its edital pages or listings protected beyond what is written.
- Whether the FGV terms bind a visitor who never registered. They say they do ("ao utilizar"), and
  this research treats that as the conservative reading; enforceability is a legal question.
- General Brazilian law on the reuse of public, factual listings was not researched.
