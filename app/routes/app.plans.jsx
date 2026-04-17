import { useState, useEffect } from "react";
import { useLoaderData, useFetcher, useNavigation, Form } from "react-router";
import { authenticate } from "../shopify.server";
import { useAppBridge } from "@shopify/app-bridge-react";
import {
  Page,
  Layout,
  Card,
  Text,
  Badge,
  Button,
  InlineStack,
  BlockStack,
  ButtonGroup,
  SkeletonPage,
  SkeletonDisplayText,
  SkeletonBodyText,
} from "@shopify/polaris";

// ─────────────────────────────────────────────────────────────────────────────
// LOADER - Check current subscription status
// ─────────────────────────────────────────────────────────────────────────────
export const loader = async ({ request }) => {
  const { billing } = await authenticate.admin(request);
  try {
    const billingCheck = await billing.check({
      plans: ["Pro Monthly", "Pro Yearly"],
      isTest: true,
    });
    
    const activeSub = billingCheck.hasActivePayment 
      ? billingCheck.appSubscriptions.find(s => s.status === "ACTIVE")
      : null;

    return {
      subscription: activeSub,
      apiKey: process.env.SHOPIFY_API_KEY,
    };
  } catch (e) {
    return { subscription: null, apiKey: process.env.SHOPIFY_API_KEY };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ACTION - Create subscription via GraphQL directly (most reliable method)
// ─────────────────────────────────────────────────────────────────────────────
export const action = async ({ request }) => {
  const { admin, session, billing } = await authenticate.admin(request);
  const formData = await request.formData();
  const planName = formData.get("planName");

  // Plan Details (matches shopify.server.js)
  const PLAN_DATA = {
    "Pro Monthly":  { amount: 8,   interval: "EVERY_30_DAYS", trial: 7 },
    "Pro Yearly":   { amount: 72,  interval: "ANNUAL",        trial: 7 },
  };

  if (planName === "Starter") {
    const billingCheck = await billing.check({
      plans: ["Pro Monthly", "Pro Yearly"],
      isTest: true,
    });
    if (billingCheck.hasActivePayment) {
      await billing.cancel({
        subscriptionId: billingCheck.appSubscriptions[0].id,
        isTest: true,
        prorate: true,
      });
    }
    return { success: true };
  }

  const plan = PLAN_DATA[planName];
  if (!plan) return { error: "Plan not found" };

  // Determine API Key carefully
  const apiKey = process.env.SHOPIFY_API_KEY || "27bee79bfa6071d88605e515871d4a7d";
  const returnUrl = `https://${session.shop}/admin/apps/${apiKey}/app/plans`;

  const response = await admin.graphql(
    `mutation appSubscriptionCreate($name: String!, $lineItems: [AppSubscriptionLineItemInput!]!, $returnUrl: URL!, $test: Boolean!) {
      appSubscriptionCreate(name: $name, lineItems: $lineItems, returnUrl: $returnUrl, test: $test) {
        appSubscription { id }
        confirmationUrl
        userErrors { field message }
      }
    }`,
    {
      variables: {
        name: planName,
        test: true,
        returnUrl: returnUrl,
        lineItems: [
          {
            plan: {
              appRecurringPricingDetails: {
                price: { amount: plan.amount, currencyCode: "USD" },
                interval: plan.interval,
              },
            },
          },
        ],
      },
    }
  );

  const responseJson = await response.json();
  const data = responseJson.data?.appSubscriptionCreate;

  if (data?.userErrors?.length > 0) {
    return { error: data.userErrors[0].message };
  }

  return { confirmationUrl: data.confirmationUrl };
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function Plans() {
  const { subscription } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const navigation = useNavigation();
  const [isYearly, setIsYearly] = useState(false);

  const isPageLoading = navigation.state === "loading" || (fetcher.state === "submitting" && fetcher.formData?.get("planName"));

  // Redirect logic
  useEffect(() => {
    if (fetcher.data?.confirmationUrl) {
      window.top.location.href = fetcher.data.confirmationUrl;
    } else if (fetcher.data?.error) {
      shopify.toast.show(fetcher.data.error, { isError: true });
    } else if (fetcher.data?.success) {
      shopify.toast.show("Plan updated successfully");
    }
  }, [fetcher.data, shopify]);

  if (isPageLoading) {
    return (
      <SkeletonPage title="Plans & Pricing" primaryAction>
        <Layout>
          {[1, 2].map((i) => (
            <Layout.Section variant="oneHalf" key={i}>
              <Card>
                <BlockStack gap="500">
                  <SkeletonDisplayText size="small" />
                  <SkeletonBodyText lines={3} />
                  <div style={{ marginTop: "20px" }}>
                    <SkeletonBodyText lines={1} />
                  </div>
                </BlockStack>
              </Card>
            </Layout.Section>
          ))}
        </Layout>
      </SkeletonPage>
    );
  }

  const currentPlanName = subscription?.name || "Starter";

  const plans = [
    {
      name: "Starter", badge: "STARTER", tone: "new",
      description: "Essential tools to show your social proof.",
      priceMonthly: 0, priceYearly: 0, 
      features: [
        "Up to 12 Latest Posts",
        "Up to 4 Posts per Row",
        "Header & Subtext Control",
        "Post Metrics on Hover",
        "Responsive Grid Layout",
        "Standard Support"
      ],
      isCurrent: currentPlanName === "Starter",
    },
    {
      name: "Pro", badge: "PRO", tone: "info",
      description: "Advanced controls for growing brands.",
      priceMonthly: 8, priceYearly: 6, 
      features: [
        "Everything in Starter+",
        "Remove 'BOOST STAR' Watermark",
        "Infinite Scrolling Feature",
        "Manual Hide Mode (Hide Posts)",
        "Premium Story Layouts",
        "Unlimited Posts & Columns",
        "Custom Branding Colors",
        "Priority 24/7 Support"
      ],
      isCurrent: currentPlanName.includes("Pro"),
      monthlyName: "Pro Monthly", yearlyName: "Pro Yearly",
    },
  ];

  const handlePlan = (plan) => {
    if (plan.isCurrent) return;
    const name = plan.name === "Starter" ? "Starter" : (isYearly ? plan.yearlyName : plan.monthlyName);
    const fd = new FormData();
    fd.append("planName", name);
    fetcher.submit(fd, { method: "POST" });
  };

  const isSubmitting = fetcher.state !== "idle" || navigation.state !== "idle";

  return (
    <Page title="Plans & Pricing">
      <BlockStack gap="800">
        <div style={{ textAlign: "center", marginTop: "40px", marginBottom: "24px" }}>
          <Text variant="heading2xl" as="h1">Choose the perfect plan for your store</Text>
          <div style={{ marginTop: "12px", color: "#64748b" }}>
            <Text variant="bodyLg" as="p">Switch plans at any time to unlock premium features and branding.</Text>
          </div>
        </div>

        <InlineStack align="center">
          <div style={{ background: "#f1f5f9", padding: "6px", borderRadius: "12px", display: "flex", alignItems: "center", gap: "12px" }}>
             <Text variant="bodyMd" as="span" tone={!isYearly ? "base" : "subdued"}>Monthly</Text>
             <button 
                onClick={() => setIsYearly(!isYearly)}
                style={{ 
                  width: "48px", height: "24px", borderRadius: "12px", background: "#6366f1", position: "relative", border: "none", cursor: "pointer", padding: 0
                }}
             >
                <div style={{ 
                  width: "18px", height: "18px", borderRadius: "50%", background: "white", 
                  position: "absolute", top: "3px", left: isYearly ? "27px" : "3px", 
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)" 
                }} />
             </button>
             <Text variant="bodyMd" as="span" tone={isYearly ? "base" : "subdued"}>Yearly <Badge tone="success" size="small">SAVE 25%</Badge></Text>
          </div>
        </InlineStack>

        <div style={{ display: "flex", justifyContent: "center", gap: "24px", padding: "20px 0", maxWidth: "1000px", margin: "0 auto", width: "100%" }}>
          {plans.map((p) => (
            <div key={p.name} style={{ flex: 1, minWidth: "320px" }}>
              <Card background={p.isCurrent ? "bg-surface-secondary" : "bg-surface"}>
                <BlockStack gap="600">
                  <InlineStack align="space-between">
                    <Badge tone={p.tone} size="large">{p.badge}</Badge>
                    {p.isCurrent && <Badge tone="success">Current Plan</Badge>}
                  </InlineStack>
                  
                  <div>
                    <Text as="p" tone="subdued" variant="bodyMd">{p.description}</Text>
                  </div>

                  <InlineStack align="start" blockAlign="end" gap="100">
                    {p.priceMonthly === 0 ? <Text as="h2" variant="heading3xl">Free</Text> : (
                      <>
                        <Text as="span" variant="bodyLg">USD</Text>
                        <Text as="h2" variant="heading3xl">${isYearly ? p.priceYearly : p.priceMonthly}</Text>
                        <Text as="span" variant="bodyMd" tone="subdued">/month</Text>
                      </>
                    )}
                  </InlineStack>

                  <div style={{ height: "1px", background: "#f1f5f9", margin: "8px 0" }} />

                  <BlockStack gap="300">
                    {p.features.map((feature, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "start", gap: "10px" }}>
                        <div style={{ width: "20px", height: "20px", background: "#ecfdf5", borderRadius: "50%", display: "flex", alignItems: "center", justifyItems: "center", flexShrink: 0 }}>
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ margin: "auto" }}>
                            <path d="M10 3L4.5 8.5L2 6" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <Text variant="bodyMd" as="span">{feature}</Text>
                      </div>
                    ))}
                  </BlockStack>

                  <div style={{ marginTop: "12px" }}>
                    <Button
                      size="large"
                      variant={p.isCurrent ? "secondary" : "primary"}
                      disabled={p.isCurrent || isSubmitting}
                      loading={isSubmitting && fetcher.formData?.get("planName")?.includes(p.name)}
                      onClick={() => handlePlan(p)}
                      fullWidth
                    >
                      {p.isCurrent ? "Already Subscribed" : (p.name === "Pro" ? "Get Started with Pro" : "Back to Starter")}
                    </Button>
                  </div>
                </BlockStack>
              </Card>
            </div>
          ))}
        </div>
      </BlockStack>
    </Page>
  );
}
