import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

const rateLimited = new Counter('rate_limited_429');
const hasRetryAfter = new Counter('has_retry_after_header');

export const options = {
  scenarios: {
    single_attacker: {
      executor: 'constant-arrival-rate',
      rate: 5,
      timeUnit: '1s',
      duration: '60s',
      preAllocatedVUs: 1,
      maxVUs: 2,
    },
  },
  thresholds: {
    // Expect the rate limit to kick in — most requests should be 429
    rate_limited_429: ['count>0'],
    // No 5xx errors
    'http_req_failed{scenario:single_attacker}': ['rate<0.01'],
  },
};

export default function () {
  const res = http.get(
    'http://localhost:3000/api/adopt-certificate?donor_name=test&alpaca_name=Avalon'
  );

  if (res.status === 429) {
    rateLimited.add(1);
    const hasHeader = res.headers['Retry-After'] !== undefined;
    if (hasHeader) hasRetryAfter.add(1);
    check(res, {
      '429 has Retry-After header': (r) => r.headers['Retry-After'] !== undefined,
    });
  } else {
    check(res, {
      'non-429 is 200': (r) => r.status === 200,
      'no 5xx': (r) => r.status < 500,
    });
  }
}
