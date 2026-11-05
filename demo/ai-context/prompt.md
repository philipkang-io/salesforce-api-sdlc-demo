Write a TypeScript function `enrollGoldMember(name: string, memberNumber: string)` that enrolls a new Gold-tier member in our loyalty program, using our Salesforce org's Loyalty Member API.

- Use `fetch`. No SDKs.
- Get an access token with the OAuth 2.0 client credentials flow, using the environment variables `SF_MY_DOMAIN`, `SF_CLIENT_ID` and `SF_CLIENT_SECRET`.
- Return the new member's record ID.

Reply with the code only, in one TypeScript code block.
