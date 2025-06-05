# API & Frontend Security Checklist

## A. Backend Security Checklist

### Input Validation & Sanitisation
- [ ] Validate all user input (data types, formats, ranges) on the server-side to prevent malicious data from entering the system.
- [ ] Sanitise all user-generated content (e.g., HTML, JavaScript) before processing, storing, or returning it in responses.
- [ ] Use parameterised queries or an ORM like TypeORM to prevent SQL injection vulnerabilities.

### Security Headers
- [ ]  `helmet.js` middleware in the API to automatically set essential HTTP security headers.
- [ ] Enable HTTP Strict Transport Security (HSTS) using the `Strict-Transport-Security` header to force all client communication over HTTPS.
- [ ] Use the `Content-Security-Policy` header to restrict content sources and mitigate XSS risks.
- [ ] Enable `X-XSS-Protection` header to activate the browser's built-in XSS filters.

### Rate Limiting & DDoS Mitigation
- [ ] Implement API rate limiting to control the number of requests a client can make within a specific timeframe.
- [ ]  integrating a Web Application Firewall (WAF) like AWS WAF for broader protection against web exploits and DDoS attacks?

### Error Handling & Logging
- [ ] Implement custom error handling middleware that hides sensitive information in error messages returned to clients.
- [ ] Log all security-relevant events (e.g., login attempts, access failures, validation failures).

### CSRF Protection
- [ ] Implement anti-forgery tokens for all state-changing requests to prevent CSRF attacks.

### Dependency Management
- [ ] Ensure usage of the latest security patches for all dependencies.
- [ ] Make sure we use `npm audit` to identify and resolve known issues.

### Secrets Management
- [ ] Avoid hardcoding secrets in API code or configuration files.
- [ ] Retrieve secrets securely using a tool like AWS Systems Manager Parameter Store.
- [ ] Implement automated secret rotation for all stored credentials to ensure they are short-lived.

---

## B. Frontend Security Checklist

### XSS Prevention
- [ ] Rely on React's automatic string escaping for JSX to treat user input as text.
- [ ] Use controlled components for form inputs to manage state and sanitise data before DOM updates.
- [ ] Sanitise URL parameters if they are rendered into the DOM.

### Content Security Policy
- [ ] Implement a strict CSP via HTTP headers to whitelist trusted content sources and mitigate XSS risks.

### Secure Communication
- [ ] Ensure all communication with the API is done over HTTPS.

### Secure Coding Practices
- [ ] Write TS code in strict mode to enforce type safety.
- [ ] Avoid direct DOM manipulation.

### Error Handling
- [ ] Implement user-friendly client-side error messages that do not expose technical details.
- [ ] logging client-side errors to a monitoring system for debugging and security analysis?

### Sensitive Data Handling
- [ ] Avoid storing sensitive data (e.g., session tokens) in `localStorage` or `sessionStorage`.
- [ ] Validate and sanitise all data on the client side before submission, in addition to mandatory server-side validation.
