import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    constant_rps: {
      executor: 'constant-arrival-rate',
      rate: 50,
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 60,
      maxVUs: 100,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.get('http://localhost:3000/og?title=Test');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'no 5xx': (r) => r.status < 500,
    'p95 < 500ms (checked per request)': (r) => r.timings.duration < 500,
  });
}
