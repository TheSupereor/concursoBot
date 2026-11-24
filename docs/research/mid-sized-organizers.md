# Mid-sized exam organizers: which lists can we read automatically?

Research for issue #25. Surveyed on 2026-11-23 against the organizers' own sites only.

## Method

- Every request used `User-Agent: RadarConcursosBot/1.0 (+https://github.com/TheSupereor/concursoBot)`,
  one at a time with about a 1 s pause. Roughly 60 requests across eight organizers.
- I never retried with another User-Agent, solved a challenge, or logged in. When the competition list
  answered with a block or a bot challenge, I stopped for that organizer.
- "Open today" means the number of entries in the organizer's own "inscrições abertas" section on
  2026-11-23. I did not cross-check those entries against the edital PDFs.
- Already covered elsewhere and not redone here: Cebraspe, Cesgranrio, FGV, Vunesp, FCC and PCI Concursos.

A finding that matters for implementation: **IBFC, Quadrix and Selecon all run on the same hosted
platform, `selecao.net.br`** (same `/index/abertos/`, `/index/1/` and `/informacoes/{id}/` routes, same
`static-cdn.selecao.net.br` assets and the same robots.txt). A single parser could cover every
organizer that uses it. IBADE uses a different hosted platform, `selecao.site` (footer credit:
gestoreditais.com.br).

---

## IBFC (Instituto Brasileiro de Formação e Capacitação)

- **Site:** https://www.ibfc.org.br/ (static site on S3/CloudFront).
- **List:** https://ibfc.selecao.net.br/index/abertos/ (open), `/index/1/` (in progress), `/index/3/` (finished).
  The site menu links to these.
- **Format:** server-rendered HTML (ISO-8859-1), with one `<a class="lista-concurso" href="/informacoes/{id}/">`
  per competition. I found no JSON endpoint, RSS feed or WordPress install.
- **Fields on the list:** a title (organization plus a free-text description), edital number, and
  registration period ("Inscrições de dd/mm/aaaa a dd/mm/aaaa"), plus a link. The detail page adds exact
  times and a "Situação" field. There is no state (UF), role, salary or number of openings, either on the
  list or on the detail page.
- **Open vs finished:** yes, one URL per status.
- **robots.txt:** https://ibfc.selecao.net.br/robots.txt disallows only `/admin/*`, `/painel/*` and `/uploads/*`,
  so the list paths are allowed. On `www.ibfc.org.br`, both `/` and `/robots.txt` answer **403**, but the
  403 comes from CloudFront's cached S3 error response (`Server: AmazonS3`, `X-Cache: Error from
cloudfront`, `Age: 48481`), whose body is the homepage. `/menus/home.html` returns 200 to the same
  User-Agent. This is a hosting quirk, not a bot block. Under RFC 9309 a 4xx robots.txt means
  "allowed".
- **Bot User-Agent accepted:** yes, on `ibfc.selecao.net.br` (200).
- **Terms of use:** none found. The only policy is https://www.ibfc.org.br/menus/privacidade.html
  (personal data / LGPD), which has no clause on automated access or reuse.
- **Open today:** 1 on the list (Jovem Aprendiz, Edital 29/2026, open until 01/12/2026), plus about 10
  in progress. The IBGE PSS 01/2026 is advertised only in the homepage carousel and runs on a
  separate system (`inscricao-ibge.ibfc.com.br`), so the list misses it.
- **Verdict: usable with caveats.** It is allowed and the markup is clean and shared with other
  organizers. The data is thin (no UF, roles or salary), volume is very low, and big contracts such as
  IBGE can live outside the list.

## Instituto AOCP

- **Site:** https://www.institutoaocp.org.br/ (Next.js app).
- **List:** https://www.institutoaocp.org.br/concursos/status/inscricoes-abertas (also `novos`,
  `em-andamento`, `resultados-disponiveis`, `finalizados`). These pages render the list on the client side.
- **Format: JSON API.** The page bundle (`app/concursos/status/[status]/page-*.js`) calls
  `GET /api/concursos?status=<S>`, with `S` one of `SUBSCRIBE`, `NEW`, `IN_PROGRESS`,
  `RESULT_AVAILABLE` or `FINISHED`. It answers with `application/json`, an array of objects.
  The API is undocumented; the bundle also references `https://link.institutoaocp.org.br/api` for details
  and a second origin, `proseleta`.
- **Fields:** `id`, `nome` (organization, sometimes with a UF suffix such as "- BA"), `chamada` (free-text
  headline), `status`, `numeroEdital`, `tipoProcesso`, `dataInicioInscricao`, `dataInscricao` (deadline,
  `dd/mm/aaaa hh:mm:ss`), `dataProva`, `logo` and `origem`. The schema also has `vagas`, `remuneracao`,
  `cargos` and `escolaridades`, but **all four were `null` in every record**. Each public link is
  `https://www.institutoaocp.org.br/concursos/{id}` (200). There is no UF field.
- **Open vs finished:** yes, through `status`. However, the flag is **stale**: two of the four
  `SUBSCRIBE` records were not open. One closed on 18/11/2026; the other is a suspended competition with a
  2020 deadline. Filter on `dataInscricao`, not on the status alone.
- **robots.txt:** none (404, which means everything is allowed).
- **Bot User-Agent accepted:** yes (200).
- **Terms of use:** none found. `/politicas/privacidade` renders on the client side, and its HTML
  contained no clause on automated access. The footer has no terms-of-use link.
- **Open today:** the API lists 4 `SUBSCRIBE` and 1 `NEW`. Judged by deadline, about 3 are really
  open: PMPE and CBMPE close today at 14:00, and IFG is open until 23/12/2026.
- **Verdict: usable with caveats.** It is the only true JSON API in this group and the cheapest to
  read (one request per status). The API is undocumented, and the `legado` / `proseleta` origins
  suggest a migration in progress, so it can change without notice. The status flag needs a
  deadline cross-check, and roles, salaries and openings are empty.

## Quadrix (Instituto Quadrix)

- **Site / list:** https://quadrix.org.br/index/abertos/ (also `/index/1/` in progress, `/index/3/`, `/index/4/`,
  `/index/6/`). It runs on the `selecao.net.br` platform.
- **Format:** server-rendered HTML, the same layout family as IBFC and Selecon.
- **Fields:** process type, organization with its abbreviation (for example "CAU-SC", so the UF is often
  inside the name), edital number, registration period, fee-exemption period, and a link to
  `/informacoes/{id}/`. There is no role, salary or number of openings.
- **Open vs finished:** yes, one URL per status.
- **robots.txt:** a Cloudflare-managed file: `User-agent: *` / `Allow: /` with
  `Content-Signal: search=yes,ai-train=no,use=reference`. It also disallows named AI crawlers.
- **Bot User-Agent accepted:** yes (200).
- **Terms of use:** https://quadrix.org.br/conteudo/1006/ ("Políticas e Termos"), section on users'
  obligations, item (j): _"não reproduzir, duplicar, comercializar ou redistribuir quaisquer ferramentas,
  Serviços ou conteúdos"_ (followed by "sem autorização expressa"). In English: users may not reproduce,
  duplicate, sell or redistribute any of the platforms' content without express authorization.
  The copyright section also limits downloads to personal use and forbids commercial use without prior
  authorization.
- **Open today:** 1 (CAU-SC, Edital 01/2026, open until 09/12/2026).
- **Verdict: not usable without permission.** It is technically trivial and allowed by robots.txt, but
  the terms forbid redistributing the content in a paid product without express authorization. This
  is the same class of problem that ruled out PCI Concursos. Ask Quadrix for permission first.

## IDECAN

- **Site:** https://idecan.org.br/ (WordPress/Elementor). Its `/wp-json/wp/v2/types` has only the
  standard types plus Elementor ones; there is no competition post type. The homepage carries a
  hand-picked set of links to `https://concurso.idecan.org.br/editais/{id}`.
- **List:** https://concurso.idecan.org.br/editais
- **robots.txt:** the same Cloudflare-managed file on both hosts (`Allow: /`, with
  `Content-Signal: search=yes,ai-train=no,use=reference`).
- **Bot User-Agent accepted:** **no.** `/editais` answers **403** with a Cloudflare managed challenge
  ("Just a moment... Enable JavaScript and cookies"), while the main site and robots.txt answer 200.
  **This host blocks identified bots, so I stopped here.** I did not read the format, fields, count or
  terms of use.
- **Verdict: not usable.**

## Fundatec

- **Site:** https://www.fundatec.org.br/
- **Bot User-Agent accepted:** **no.** Every path, including `/` and `/robots.txt`, answers
  `202 Accepted` with an empty body and `x-amzn-waf-action: challenge` (an AWS WAF JavaScript
  challenge, served by `awselb/2.0`). A client that does not run JavaScript cannot even read
  robots.txt. **This site blocks identified bots, so I stopped here.** I did not read the list URL,
  format, fields, count or terms of use.
- **Verdict: not usable.**

## Instituto Consulplan

- **Site / list:** https://www.institutoconsulplan.org.br/Concursos (ASP.NET with htmx).
- **Format:** server-rendered HTML. A single page holds three sections, each under an `<h3>`:
  "Inscrições abertas / Novos", "Em andamento" and "Encerrados". Each competition is a
  `div.card` (inside `id="concurso"`) with `h5.card-title` (organization, usually ending in "/UF", for
  example "Câmara Municipal de Unaí/MG"), `h6.card-subtitle` (process type), and a "Mais Informações"
  link to a slug (`/unai2026`) or an opaque token. The detail page lists only the published documents
  with their dates.
- **Fields:** organization, UF (parsed from the "/UF" suffix), process type and link. There is **no
  deadline**, role, salary or number of openings, even on the detail page. One card in the open section
  is marked as advertised in partnership ("divulgação em parceria").
- **Open vs finished:** yes, by section heading. However, "abertas" and "novos" share one section.
- **robots.txt:** `Allow: /`. It disallows `/Candidato/`, `/Concurso/AcessarInscricao/`, `/admin/` and
  **`/api/`**, so any JSON under `/api/` is off-limits. `/Concursos` and the detail slugs are allowed. The
  file also explicitly allows GPTBot, ClaudeBot and other AI crawlers.
- **Bot User-Agent accepted:** yes (200).
- **Terms of use:** none found. `/PoliticaPrivacidade` covers only personal data, and the menu has no
  terms page.
- **Open today:** 6 open or new, 19 in progress and 271 finished, all on one page of about 23 KB.
- **Verdict: usable with caveats.** It is permitted, and a single request returns the whole catalog
  with a usable UF. Without a deadline, the bot cannot tell "open" from "announced", nor say when
  registration closes. Card markup on an htmx site is moderately stable.

## Selecon (Instituto Nacional de Seleções e Concursos)

- **Site:** https://selecon.org.br/ (WordPress). The `/wp-json/wp/v2/types` endpoint has no
  competition post type, only Elementor, Jetpack and JetEngine types. `/concursos/` is a hand-built page.
- **Lists:** two `selecao.net.br` hosts:
  https://selecon.selecao.net.br/index/abertos/ (mainly RJ) and
  https://selecon-mt.selecao.net.br/index/abertos/ (Mato Grosso). The main site links to both.
- **Format:** server-rendered HTML on the `selecao.net.br` platform, with a theme variant different from
  IBFC's and Quadrix's (Bootstrap 4, "+ Informações" links).
- **Fields:** a title that combines the process type, organization and UF (for example "Concurso Público -
  Prefeitura Municipal de São Gonçalo - RJ - Guarda Municipal Nível II"), edital number, registration
  period, fee-exemption period, and a link to `/informacoes/{id}/`. A few entries omit the dates and show
  only "Inscrições Abertas!". The title sometimes names the role, but there is no structured role,
  salary or number of openings.
- **Open vs finished:** yes, one URL per status. The RJ page also shows counters (15 in progress,
  47 finished).
- **robots.txt:** on both list hosts, only `/admin/*`, `/painel/*` and `/uploads/*` are disallowed.
  On `selecon.org.br`, only `/wp-admin/` is disallowed.
- **Bot User-Agent accepted:** yes (200 on all three hosts).
- **Terms of use:** none found. Neither the `selecon.org.br` home nor `/concursos/` links to terms or
  a privacy policy. I did not search the `selecao.net.br` hosts for a terms page.
- **Open today:** 8 (3 on the RJ host and 5 on the MT host).
- **Verdict: usable.** It is permitted, carries the richest fields in this group short of the AOCP
  API (UF and deadline are both present), and reuses the shared platform parser. It needs two hosts
  per run.

## IBADE (Instituto Brasileiro de Apoio e Desenvolvimento Executivo)

- **Site:** https://ibade.org.br/ (WordPress/JupiterX). `/wp-json/wp/v2/types` includes a
  `concursos-anteriores` post type, but it holds only the archive from 2021 and earlier, not live
  competitions.
- **List:** https://portal.ibade.selecao.site/edital. It is one page with Bootstrap tabs:
  `#abertos`, `#andamento`, `#encerrados`, `#futuros` and `#suspensos`.
- **Format:** server-rendered HTML (UTF-8). Each competition is a `div.card`, where the first `p` holds
  the process type and number ("Concurso Público - 001/2026"), the second holds the organization, and the
  link goes to `/edital/ver/{id}`.
- **Fields:** process type, edital number, organization (the UF sometimes appears in the name, such as
  "CREF22/ES" or "DE RONDÔNIA"), and link. The **detail page** lists roles by education level, with
  codes and requirements, plus the edital documents. There is **no deadline**: the page says that
  registration follows the schedule annex, a PDF. There is no salary or number of openings.
- **Open vs finished:** yes, by tab.
- **robots.txt:** none on `portal.ibade.selecao.site` (404, which means allowed). On `ibade.org.br`, only
  `/wp-admin/` is disallowed.
- **Bot User-Agent accepted:** yes (200).
- **Terms of use:** none found. The portal's "Termos de Uso" link has an empty `href`, and
  https://ibade.org.br/politica-de-privacidade/ has no clause on automated access or reuse.
- **Open today:** 1 open, 8 in progress and 98 finished; no future or suspended entries.
- **Verdict: usable with caveats.** It is permitted, one request returns everything, and the markup is
  clean. Without a deadline on the list, a deadline means reading a PDF; roles need one detail page per
  competition. Volume is low.

---

## Ranking of the usable organizers

Ordered by data richness first, then stability.

| Rank | Organizer            | Access                                         | Fields we get                                                                                                   | Open today             | Stability                                                  | Main caveat                                                                           |
| ---- | -------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 1    | Instituto AOCP       | JSON API `GET /api/concursos?status=SUBSCRIBE` | organization, edital no., type, start and end of registration (with time), link; UF only sometimes, in the name | ~3 (4 flagged + 1 new) | Medium: undocumented, mid-migration (`legado`/`proseleta`) | Status flag is stale; filter by `dataInscricao`. Roles, salary and openings are null. |
| 2    | Selecon              | HTML, `selecao.net.br` (2 hosts)               | type, organization, UF (in title), edital no., registration period, link                                        | 8                      | Good: shared platform markup                               | Two hosts; a few entries have no dates.                                               |
| 3    | IBFC                 | HTML, `selecao.net.br`                         | organization + description, edital no., registration period, link                                               | 1                      | Good: shared platform markup                               | No UF; very low volume; IBGE PSS lives outside the list.                              |
| 4    | Instituto Consulplan | HTML, single page, `/Concursos`                | organization, UF ("/UF" suffix), type, link                                                                     | 6                      | Medium: htmx card markup                                   | No deadline anywhere; "open" and "new" mixed; `/api/` disallowed.                     |
| 5    | IBADE                | HTML, single page with tabs, `/edital`         | type, edital no., organization, link; roles on detail page                                                      | 1                      | Good: clean card markup                                    | No deadline (only in a PDF); low volume.                                              |

Not usable: **Quadrix** (its terms forbid redistributing content without express authorization; ask
first; technically it would fit the `selecao.net.br` parser), **IDECAN** (Cloudflare challenge on the
list host), and **Fundatec** (an AWS WAF challenge on every path, including robots.txt).

## Not verified

- IDECAN and Fundatec: format, fields, counts and terms of use. They block identified bots, and that
  block was deliberately not bypassed.
- AOCP: whether `/politicas/privacidade` holds terms once rendered on the client side. Only the
  server HTML was read.
- Selecon: whether the `selecao.net.br` hosts publish a terms page of their own.
- Detail pages were sampled once per organizer (IBFC, AOCP, Consulplan, IBADE) and not at all for
  Quadrix and Selecon. Whether a Selecon detail page lists roles or salaries is unknown.
- "Open today" counts are the organizers' own labels and were not checked against the edital PDFs.
- Whether the `selecao.net.br` platform exposes a sitemap or feed that would be cheaper than the list
  pages. The robots.txt files advertise `/sitemap.xml`, but I did not fetch it.
