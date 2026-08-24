import { useState } from "react";
import { useLoaderData, useNavigate } from "react-router";
import { authenticate } from "../shopify.server";
import {
  Page,
  Layout,
  Card,
  Text,
  Badge,
  Button,
  ButtonGroup,
  BlockStack,
  InlineStack,
  Box,
  Divider,
  ProgressBar,
  Icon,
} from "@shopify/polaris";
import {
  CheckIcon,
  PlayIcon,
  PlusIcon,
  SettingsIcon,
  CheckCircleIcon,
  StoreIcon,
  ExternalIcon,
  AppsIcon,
  ViewIcon,
} from "@shopify/polaris-icons";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const { admin } = await authenticate.admin(request);

  let themeId = "";
  try {
    const response = await admin.graphql(
      `#graphql
      query getThemes {
        themes(first: 10, roles: [MAIN]) {
          nodes {
            id
            name
            role
          }
        }
      }`
    );
    const themesData = await response.json();
    const mainTheme = themesData.data?.themes?.nodes?.find((t) => t.role === "MAIN");
    themeId = mainTheme ? mainTheme.id.split("/").pop() : "";
  } catch (e) {}

  return {
    shop: session.shop,
    themeId,
    clientId: process.env.SHOPIFY_API_KEY,
  };
};

export default function Guide() {
  const { shop, themeId, clientId } = useLoaderData();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(1);

  const steps = [
    {
      id: 1,
      title: "Activate App Core Extension",
      subtitle: "Enable the widget script in your theme",
      icon: PlayIcon,
      description:
        "To display your Instagram feed, Shopify requires you to turn on our app embed extension in your theme. This is a one-time activation that loads required widget resources asynchronously without slowing down your storefront.",
      actionText: "Open Theme Editor",
      action: () => {
        const url = `https://${shop}/admin/themes/${themeId}/editor?context=apps&activateAppId=${clientId}/app-embed&activateAppEmbed=${clientId}/app-embed`;
        window.open(url, "_blank");
      },
    },
    {
      id: 2,
      title: "Add Visual Sections",
      subtitle: "Place your feed anywhere on your store",
      icon: PlusIcon,
      description:
        "In your Theme Editor, navigate to your Homepage, Product page, or any Custom page. Click 'Add Section' in the left sidebar and search for 'Instagram Feed' or 'Instagram Stories' to place the gallery block wherever you desire.",
      actionText: "Open Theme Sections",
      action: () => {
        const url = `https://${shop}/admin/themes/${themeId}/editor?addAppBlockId=${clientId}/feed-grid&target=newAppsSection`;
        window.open(url, "_blank");
      },
    },
    {
      id: 3,
      title: "Customize Branding & Styles",
      subtitle: "Tailor colors, fonts, columns & layout",
      icon: SettingsIcon,
      description:
        "Click on the added section to customize typography, layout alignment, desktop/mobile column counts, and visual gaps. You can also hide specific posts or enable discount coupon popups.",
    },
    {
      id: 4,
      title: "Save & Go Live",
      subtitle: "Publish your changes instantly",
      icon: CheckCircleIcon,
      description:
        "Click 'Save' in the top-right corner of the Shopify Theme Editor. Your shoppable Instagram feed and story highlights are now live on your storefront!",
    },
  ];

  return (
    <Page
      title="Guide & Setup"
      subtitle="Follow this step-by-step interactive walkthrough to launch your Instagram feed on your store in minutes"
      backAction={{ content: "Dashboard", onAction: () => navigate("/app") }}
      badge={<Badge tone="info">Step {activeStep} of 4</Badge>}
    >
      <BlockStack gap="500">
        <ProgressBar progress={(activeStep / 4) * 100} size="small" tone="highlight" />

        <Layout>
          {/* Left Column: Interactive Steps List */}
          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              <Card>
                <BlockStack gap="300">
                  <Text variant="headingSm" as="h2">
                    Setup Steps
                  </Text>
                  <Text variant="bodySm" tone="subdued">
                    Click any step below to view instructions and visual guides.
                  </Text>

                  <Divider />

                  <BlockStack gap="200">
                    {steps.map((step) => {
                      const isActive = activeStep === step.id;
                      const isCompleted = activeStep > step.id;
                      return (
                        <Box
                          key={step.id}
                          padding="300"
                          borderRadius="200"
                          background={isActive ? "bg-surface-brand-active" : "bg-surface-secondary"}
                          borderWidth="025"
                          borderColor={isActive ? "border-brand" : "border"}
                          onClick={() => setActiveStep(step.id)}
                          style={{ cursor: "pointer", transition: "all 0.2s ease" }}
                        >
                          <InlineStack align="space-between" blockAlign="center">
                            <InlineStack gap="300" blockAlign="center">
                              <div
                                style={{
                                  width: "26px",
                                  height: "26px",
                                  borderRadius: "50%",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "12px",
                                  fontWeight: "700",
                                  background: isCompleted ? "#10b981" : isActive ? "#2563eb" : "#cbd5e1",
                                  color: "white",
                                }}
                              >
                                {isCompleted ? <Icon source={CheckIcon} tone="inherit" /> : step.id}
                              </div>
                              <div>
                                <Text variant="bodyMd" fontWeight={isActive ? "bold" : "semibold"}>
                                  {step.title}
                                </Text>
                                <Text variant="bodySm" tone="subdued">
                                  {step.subtitle}
                                </Text>
                              </div>
                            </InlineStack>
                            {isActive && <Badge tone="info">Current</Badge>}
                          </InlineStack>
                        </Box>
                      );
                    })}
                  </BlockStack>
                </BlockStack>
              </Card>

              {/* Need Help Card */}
              <Card>
                <BlockStack gap="200">
                  <Text variant="headingSm" as="h3">
                    Need Help With Setup?
                  </Text>
                  <Text variant="bodySm" tone="subdued">
                    Our Shopify integration experts can configure and style your Instagram gallery for free.
                  </Text>
                  <Button variant="plain" onClick={() => navigate("/app/support")}>
                    Contact Support Expert
                  </Button>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>

          {/* Right Column: Step Details & Interactive Visuals */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center" wrap>
                  <InlineStack gap="300" blockAlign="center">
                    <div
                      style={{
                        padding: "10px",
                        borderRadius: "10px",
                        background: "rgba(37, 99, 235, 0.1)",
                        color: "#2563eb",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon source={steps[activeStep - 1].icon} tone="inherit" />
                    </div>
                    <div>
                      <Text variant="headingLg" as="h2">
                        Step {activeStep}: {steps[activeStep - 1].title}
                      </Text>
                      <Text variant="bodySm" tone="subdued">
                        {steps[activeStep - 1].subtitle}
                      </Text>
                    </div>
                  </InlineStack>

                  {steps[activeStep - 1].actionText && (
                    <Button variant="primary" icon={ExternalIcon} onClick={steps[activeStep - 1].action}>
                      {steps[activeStep - 1].actionText}
                    </Button>
                  )}
                </InlineStack>

                <Text variant="bodyMd">{steps[activeStep - 1].description}</Text>

                <Divider />

                {/* Step Visual Guide Container */}
                <Box padding="600" background="bg-surface-secondary" borderRadius="300">
                  {activeStep === 1 && (
                    <BlockStack gap="400" align="center" inlineAlign="center">
                      <div
                        style={{
                          width: "280px",
                          background: "white",
                          borderRadius: "12px",
                          padding: "16px",
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <InlineStack gap="200" blockAlign="center">
                            <Icon source={StoreIcon} tone="base" />
                            <Text variant="bodySm" fontWeight="bold">
                              AI Instafeed
                            </Text>
                          </InlineStack>
                          <Badge tone="success">Active</Badge>
                        </div>
                        <Box paddingBlockStart="200">
                          <Text variant="bodyXs" tone="subdued">
                            App embed toggle in Shopify Theme Editor
                          </Text>
                        </Box>
                      </div>
                      <Text variant="headingSm" as="h3">
                        Look for the "App Embeds" Tab
                      </Text>
                      <Text variant="bodySm" tone="subdued" alignment="center">
                        Toggle AI Instafeed ON to allow the app script to load securely on your storefront.
                      </Text>
                    </BlockStack>
                  )}

                  {activeStep === 2 && (
                    <BlockStack gap="400" align="center" inlineAlign="center">
                      <InlineStack gap="300" align="center">
                        <div
                          style={{
                            width: "160px",
                            background: "white",
                            borderRadius: "12px",
                            padding: "16px",
                            textAlign: "center",
                            border: "1px solid #e2e8f0",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                          }}
                        >
                          <Icon source={AppsIcon} tone="base" />
                          <Box paddingBlockStart="200">
                            <Text variant="bodySm" fontWeight="bold">
                              Instagram Stories
                            </Text>
                          </Box>
                        </div>
                        <div
                          style={{
                            width: "160px",
                            background: "white",
                            borderRadius: "12px",
                            padding: "16px",
                            textAlign: "center",
                            border: "1px solid #e2e8f0",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                          }}
                        >
                          <Icon source={ViewIcon} tone="base" />
                          <Box paddingBlockStart="200">
                            <Text variant="bodySm" fontWeight="bold">
                              Instagram Feed Grid
                            </Text>
                          </Box>
                        </div>
                      </InlineStack>
                      <Text variant="headingSm" as="h3">
                        Add Gallery Sections to Your Pages
                      </Text>
                      <Text variant="bodySm" tone="subdued" alignment="center">
                        Click 'Add Section' in the theme editor and choose between Grid Feed or Story Highlights.
                      </Text>
                    </BlockStack>
                  )}

                  {activeStep === 3 && (
                    <BlockStack gap="400" align="center" inlineAlign="center">
                      <div
                        style={{
                          width: "280px",
                          background: "white",
                          borderRadius: "12px",
                          padding: "16px",
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                        }}
                      >
                        <BlockStack gap="200">
                          <div style={{ height: "6px", width: "40%", background: "#cbd5e1", borderRadius: "3px" }} />
                          <div style={{ height: "24px", width: "100%", background: "#f1f5f9", borderRadius: "6px", border: "1px solid #e2e8f0" }} />
                          <div style={{ height: "6px", width: "60%", background: "#cbd5e1", borderRadius: "3px" }} />
                          <div style={{ height: "20px", width: "100%", background: "#2563eb", borderRadius: "6px" }} />
                        </BlockStack>
                      </div>
                      <Text variant="headingSm" as="h3">
                        Real-Time Customization
                      </Text>
                      <Text variant="bodySm" tone="subdued" alignment="center">
                        Adjust layout columns, heading sizes, colors, and gaps directly in the sidebar with live preview.
                      </Text>
                    </BlockStack>
                  )}

                  {activeStep === 4 && (
                    <BlockStack gap="400" align="center" inlineAlign="center">
                      <div
                        style={{
                          width: "60px",
                          height: "60px",
                          borderRadius: "50%",
                          background: "#dcfce7",
                          color: "#166534",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Icon source={CheckCircleIcon} tone="inherit" />
                      </div>
                      <Text variant="headingLg" as="h3">
                        You're All Set!
                      </Text>
                      <Text variant="bodyMd" tone="subdued" alignment="center">
                        Your Instagram gallery is ready to convert storefront visitors into loyal customers.
                      </Text>
                      <Button variant="primary" onClick={() => navigate("/app")}>
                        Go to Dashboard
                      </Button>
                    </BlockStack>
                  )}
                </Box>

                {/* Step Pagination Buttons */}
                <InlineStack align="space-between" blockAlign="center">
                  <Button disabled={activeStep === 1} onClick={() => setActiveStep((prev) => prev - 1)}>
                    Previous Step
                  </Button>
                  <ButtonGroup>
                    {activeStep < 4 ? (
                      <Button variant="primary" onClick={() => setActiveStep((prev) => prev + 1)}>
                        Next Step
                      </Button>
                    ) : (
                      <Button variant="primary" onClick={() => navigate("/app")}>
                        Back to Dashboard
                      </Button>
                    )}
                  </ButtonGroup>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Footer */}
        <Box paddingBlock="600">
          <BlockStack gap="200" align="center" inlineAlign="center">
            <Text variant="bodySm" tone="subdued">
              © 2026 AI Instafeed by{" "}
              <a
                href="https://apps.shopify.com/partners/boost-star"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "inherit", textDecoration: "underline" }}
              >
                BOOST STAR Experts
              </a>
            </Text>
            <InlineStack gap="200" align="center">
              <Text variant="bodySm" tone="subdued">
                Terms of Service
              </Text>
              <Text variant="bodySm" tone="subdued">
                •
              </Text>
              <Text variant="bodySm" tone="subdued">
                Privacy Policy
              </Text>
            </InlineStack>
          </BlockStack>
        </Box>
      </BlockStack>
    </Page>
  );
}
