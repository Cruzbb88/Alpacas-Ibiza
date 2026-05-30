import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    constant_rps: {
      executor: 'constant-arrival-rate',
      rate: 20,
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 25,
      maxVUs: 40,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.get('http://localhost:3000/en/adopt');
  check(res, {
    'status 200 or redirect': (r) => r.status === 200 || (r.status >= 301 && r.status <= 308),
    'no 5xx': (r) => r.status < 500,
    'p95 < 1000ms (checked per request)': (r) => r.timings.duration < 1000,
  });
}
