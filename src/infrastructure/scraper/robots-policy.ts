import robotsParser from 'robots-parser';

export interface RobotsResponse {
  status: number;
  body: string;
}

/** Reads a robots.txt file; must not throw for HTTP error statuses, only for network failures. */
export type RobotsFetcher = (url: string) => Promise<RobotsResponse>;

export interface RobotsPolicyOptions {
  baseUrl: string;
  /** Full User-Agent header; the product token before the slash selects the rule group. */
  userAgent: string;
  /** How long a successfully read robots.txt is trusted. */
  ttlMs: number;
  fetchRobots: RobotsFetcher;
  now?: () => number;
}

interface Cached {
  parsed: ReturnType<typeof robotsParser>;
  readAt: number;
}

/**
 * Decides whether this bot may fetch a URL, following the site's robots.txt (RFC 9309):
 *
 *  - rules written for this bot by name win over the wildcard group;
 *  - no robots.txt (a 4xx) means everything is allowed;
 *  - a server error or a network failure means nothing is allowed for now. That is the
 *    conservative reading, and a failure is not cached, so the next check tries again.
 */
export class RobotsPolicy {
  private cached: Cached | null = null;
  private readonly now: () => number;
  private readonly productToken: string;

  constructor(private readonly options: RobotsPolicyOptions) {
    this.now = options.now ?? Date.now;
    this.productToken = options.userAgent.split('/')[0]?.trim() ?? '';
  }

  async isAllowed(url: string): Promise<boolean> {
    const robots = await this.load();
    if (robots === 'allow-all') return true;
    if (robots === 'deny-all') return false;
    return robots.isAllowed(url, this.productToken) ?? true;
  }

  private async load(): Promise<
    ReturnType<typeof robotsParser> | 'allow-all' | 'deny-all'
  > {
    if (this.cached && this.now() - this.cached.readAt < this.options.ttlMs) {
      return this.cached.parsed;
    }

    const robotsUrl = `${this.options.baseUrl}/robots.txt`;
    let response: RobotsResponse;
    try {
      response = await this.options.fetchRobots(robotsUrl);
    } catch {
      return 'deny-all';
    }

    if (response.status >= 500) return 'deny-all';
    if (response.status >= 400) return 'allow-all';

    const parsed = robotsParser(robotsUrl, response.body);
    this.cached = { parsed, readAt: this.now() };
    return parsed;
  }
}
