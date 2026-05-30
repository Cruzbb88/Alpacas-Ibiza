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
    http_req_duration: ['p(95)<200'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.get('http://localhost:3000/api/adopt-count');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'no 5xx': (r) => r.status < 500,
    'p95 < 200ms (checked per request)': (r) => r.timings.duration < 200,
  });
}
