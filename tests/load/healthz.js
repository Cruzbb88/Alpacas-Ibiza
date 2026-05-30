import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    constant_rps: {
      executor: 'constant-arrival-rate',
      rate: 100,
      timeUnit: '1s',
      duration: '15s',
      preAllocatedVUs: 120,
      maxVUs: 150,
    },
  },
  thresholds: {
    http_req_duration: ['p(99)<100'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.get('http://localhost:3000/healthz');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'p99 < 100ms (checked per request)': (r) => r.timings.duration < 100,
  });
}
