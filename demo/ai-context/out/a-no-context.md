```typescript
const API_VERSION = "v63.0";

interface TokenResponse {
  access_token: string;
  instance_url?: string;
}

interface EnrollmentResponse {
  loyaltyProgramMemberId: string;
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

async function getAccessToken(myDomain: string): Promise<TokenResponse> {
  const res = await fetch(`https://${myDomain}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: requireEnv("SF_CLIENT_ID"),
      client_secret: requireEnv("SF_CLIENT_SECRET"),
    }),
  });

  if (!res.ok) {
    throw new Error(`Salesforce token request failed (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as TokenResponse;
}

/**
 * Enrolls a new member in the loyalty program and returns the
 * LoyaltyProgramMember record ID.
 *
 * Requires SF_MY_DOMAIN, SF_CLIENT_ID, SF_CLIENT_SECRET, plus
 * SF_LOYALTY_PROGRAM_NAME (the Loyalty Program's name; the Member API's
 * URL is scoped to it).
 *
 * Note: the enrollment endpoint has no tier input. Gold status must come
 * from your program's tier rules or a separate LoyaltyMemberTier record.
 */
export async function enrollGoldMember(
  name: string,
  memberNumber: string
): Promise<string> {
  const myDomain = requireEnv("SF_MY_DOMAIN");
  const programName = requireEnv("SF_LOYALTY_PROGRAM_NAME");

  const { access_token, instance_url } = await getAccessToken(myDomain);
  const baseUrl = instance_url ?? `https://${myDomain}`;

  const parts = name.trim().split(/\s+/);
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : parts[0];
  const firstName = parts.length > 1 ? parts[0] : "";

  const url =
    `${baseUrl}/services/data/${API_VERSION}/connect/loyalty/programs/` +
    `${encodeURIComponent(programName)}/individual-member-enrollments`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      enrollmentDate: new Date().toISOString(),
      membershipNumber: memberNumber,
      memberStatus: "Active",
      createTransactionJournals: false,
      associatedContactDetails: { firstName, lastName },
    }),
  });

  if (!res.ok) {
    throw new Error(`Loyalty enrollment failed (${res.status}): ${await res.text()}`);
  }

  const data = (await res.json()) as EnrollmentResponse;
  if (!data.loyaltyProgramMemberId) {
    throw new Error("Enrollment response did not include loyaltyProgramMemberId");
  }
  return data.loyaltyProgramMemberId;
}
```
