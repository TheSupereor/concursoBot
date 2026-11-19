import { RobotsPolicy, RobotsFetcher } from './robots-policy';

const BASE = 'https://pci.example.test';
const AGENT = 'RadarConcursosBot/1.0 (+https://example.test/about)';

const WILDCARD_ONLY = `
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /*.pdf
`;

const ROBOTS = `${WILDCARD_ONLY}
User-agent: RadarConcursosBot
Disallow: /concursos/centro-oeste/
`;

describe('RobotsPolicy', () => {
  let fetchRobots: jest.Mock;
  let now: number;

  const policy = () =>
    new RobotsPolicy({
      baseUrl: BASE,
      userAgent: AGENT,
      ttlMs: 60_000,
      fetchRobots: fetchRobots as unknown as RobotsFetcher,
      now: () => now,
    });

  beforeEach(() => {
    now = 1_000_000;
    fetchRobots = jest.fn().mockResolvedValue({ status: 200, body: ROBOTS });
  });

  it('allows a path that robots.txt does not forbid', async () => {
    expect(await policy().isAllowed(`${BASE}/concursos/sudeste/`)).toBe(true);
  });

  it('refuses a path that robots.txt forbids to everyone', async () => {
    fetchRobots.mockResolvedValue({ status: 200, body: WILDCARD_ONLY });

    expect(await policy().isAllowed(`${BASE}/admin/users`)).toBe(false);
    expect(await policy().isAllowed(`${BASE}/edital.pdf`)).toBe(false);
  });

  it('follows the rules written for this bot by name', async () => {
    expect(await policy().isAllowed(`${BASE}/concursos/centro-oeste/`)).toBe(
      false,
    );
    expect(await policy().isAllowed(`${BASE}/concursos/sul/`)).toBe(true);
  });

  it('applies only the group written for this bot, not the wildcard one (RFC 9309)', async () => {
    // /admin/ is forbidden to "*", but this bot has its own group, which replaces it.
    expect(await policy().isAllowed(`${BASE}/admin/users`)).toBe(true);
  });

  it('reads robots.txt once for many checks', async () => {
    const p = policy();

    await p.isAllowed(`${BASE}/concursos/sul/`);
    await p.isAllowed(`${BASE}/concursos/norte/`);
    await p.isAllowed(`${BASE}/concursos/nordeste/`);

    expect(fetchRobots).toHaveBeenCalledTimes(1);
    expect(fetchRobots).toHaveBeenCalledWith(`${BASE}/robots.txt`);
  });

  it('reads it again once the cached copy is stale', async () => {
    const p = policy();
    await p.isAllowed(`${BASE}/concursos/sul/`);

    now += 61_000;
    await p.isAllowed(`${BASE}/concursos/sul/`);

    expect(fetchRobots).toHaveBeenCalledTimes(2);
  });

  describe('when robots.txt cannot be used', () => {
    it('allows everything when the site has none (4xx, per RFC 9309)', async () => {
      fetchRobots.mockResolvedValue({ status: 404, body: '' });

      expect(await policy().isAllowed(`${BASE}/anything`)).toBe(true);
    });

    it.each([500, 503])(
      'is conservative on a server error (%p) and allows nothing',
      async (status) => {
        fetchRobots.mockResolvedValue({ status, body: '' });

        expect(await policy().isAllowed(`${BASE}/concursos/sul/`)).toBe(false);
      },
    );

    it('is conservative when the request itself fails', async () => {
      fetchRobots.mockRejectedValue(new Error('timeout'));

      expect(await policy().isAllowed(`${BASE}/concursos/sul/`)).toBe(false);
    });

    it('does not cache a failure, so the next check tries again', async () => {
      const p = policy();
      fetchRobots.mockRejectedValueOnce(new Error('timeout'));
      expect(await p.isAllowed(`${BASE}/concursos/sul/`)).toBe(false);

      expect(await p.isAllowed(`${BASE}/concursos/sul/`)).toBe(true);
      expect(fetchRobots).toHaveBeenCalledTimes(2);
    });
  });
});
