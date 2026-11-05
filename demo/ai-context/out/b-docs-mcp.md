```typescript
interface TokenResponse {
  access_token: string;
  instance_url: string;
}

interface CreateRecordResponse {
  id: string;
  success: boolean;
  errors: unknown[];
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function getAccessToken(): Promise<TokenResponse> {
  const myDomain = requireEnv("SF_MY_DOMAIN");
  const clientId = requireEnv("SF_CLIENT_ID");
  const clientSecret = requireEnv("SF_CLIENT_SECRET");

  const host = myDomain.replace(/^https?:\/\//, "").replace(/\/+$/, "");

  const res = await fetch(`https://${host}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    throw new Error(`Token request failed (${res.status}): ${await res.text()}`);
  }

  return (await res.json()) as TokenResponse;
}

export async function enrollGoldMember(
  name: string,
  memberNumber: string
): Promise<string> {
  const { access_token, instance_url } = await getAccessToken();

  const res = await fetch(
    `${instance_url}/services/data/v68.0/sobjects/Loyalty_Member__c`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Name: name,
        Member_Number__c: memberNumber,
        Tier__c: "Gold",
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Enrollment failed (${res.status}): ${await res.text()}`);
  }

  const result = (await res.json()) as CreateRecordResponse;
  if (!result.success) {
    throw new Error(`Enrollment failed: ${JSON.stringify(result.errors)}`);
  }

  return result.id;
}
```
