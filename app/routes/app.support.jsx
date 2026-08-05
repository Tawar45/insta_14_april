import { useState, useEffect } from "react";
import whiteLogo from "../image/boost-star-white.png";
import { useLoaderData, useFetcher, useNavigation, Form, useNavigate } from "react-router";
import { authenticate } from "../shopify.server";
import { useAppBridge } from "@shopify/app-bridge-react";
import {
  Page,
  Layout,
  Card,
  Text,
  Badge,
  Button,
  BlockStack,
  SkeletonPage,
  SkeletonDisplayText,
  SkeletonBodyText,
  Icon,
  TextField,
  FormLayout,
  Banner,
  InlineStack,
  Divider,
  Modal,
} from "@shopify/polaris";
import { sendSupportEmail } from "../utils/email.server";
import {
  ChevronLeftIcon,
  EmailIcon,
  ChatIcon,
  PhoneIcon,
  QuestionCircleIcon,
  StarIcon,
  MagicIcon,
  AttachmentIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  PersonIcon,
  SendIcon,
  XCircleIcon
} from "@shopify/polaris-icons";

// ─────────────────────────────────────────────────────────────────────────────
// FAQ ACCORDION COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const FAQItem = ({ question, answer, isLast }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div
      onClick={() => setIsOpen(!isOpen)}
      style={{
        padding: "16px 0",
        borderBottom: isLast ? "none" : "1px solid #f1f5f9",
        cursor: "pointer"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
        <Text variant="bodyMd" fontWeight="bold">{question}</Text>
        <div style={{
          width: "28px", height: "28px", borderRadius: "50%", background: "#f8fafc",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.3s ease",
          transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
          border: "1px solid #e2e8f0",
          flexShrink: 0
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </div>
      </div>
      <div style={{
        maxHeight: isOpen ? "300px" : "0",
        overflow: "hidden",
        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        marginTop: isOpen ? "10px" : "0",
        opacity: isOpen ? 1 : 0
      }}>
        <Text variant="bodySm" tone="subdued">{answer}</Text>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// LOADER - Fetch shop info if needed
// ─────────────────────────────────────────────────────────────────────────────
export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  
  // Fetch shop details for default email
  const response = await admin.graphql(
    `#graphql
    query {
      shop {
        email
      }
    }`
  );
  const { data } = await response.json();
  const merchantEmail = data?.shop?.email || "";

  return {
    shop: session.shop,
    merchantEmail,
    supportEmail: process.env.SUPPORT_EMAIL || "contact@booststar.in",
    whatsappNumber: "+917000587074",
  };
};


// ─────────────────────────────────────────────────────────────────────────────
// ACTION - Handle support form submission
// ─────────────────────────────────────────────────────────────────────────────
export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const email = formData.get("email");
  const subject = formData.get("subject");
  const message = formData.get("message");
  const attachmentFiles = formData.getAll("attachment");

  let attachments = [];
  for (const attachment of attachmentFiles) {
    if (attachment && attachment.size > 0 && attachment.name) {
      const buffer = Buffer.from(await attachment.arrayBuffer());
      attachments.push({
        filename: attachment.name,
        content: buffer,
        contentType: attachment.type,
      });
    }
  }

  // Check if SMTP is configured
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error("SMTP credentials missing in .env file");
    return { 
      success: false, 
      error: "Our mailing system is currently being configured. Please use the direct contact methods on the right for now." 
    };
  }

  const result = await sendSupportEmail({
    from: email,
    subject,
    message,
    shop: session.shop,
    attachments,
  });

  return result;
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function Support() {
  const { shop, merchantEmail, supportEmail, whatsappNumber } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const [email, setEmail] = useState(merchantEmail || "");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState({ title: "", content: "", isError: false });
  const [isHydrated, setIsHydrated] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);

  const isSubmitting = fetcher.state === "submitting";

  useEffect(() => {
    setIsHydrated(true);
  }, []);


  useEffect(() => {
    if (fetcher.data?.success) {
      setModalConfig({
        title: "Message Sent!",
        content: "Thank you for reaching out. Our support team will get back to you within 2 hours.",
        isError: false
      });
      setModalOpen(true);
      setEmail("");
      setSubject("");
      setMessage("");
      setSelectedFiles([]);
    } else if (fetcher.data?.error) {
      setModalConfig({
        title: "Submission Failed",
        content: fetcher.data.error || "Something went wrong while sending your request. Please try again.",
        isError: true
      });
      setModalOpen(true);
    }
  }, [fetcher.data]);

  if (!isHydrated) {
    return (
      <div style={{ padding: "32px", maxWidth: "1300px", margin: "0 auto" }}>
        <SkeletonPage title="Contact Support" />
      </div>
    );
  }

  return (
    <div className="premium-dashboard page-fade-in">
      <style>{`
        .page-fade-in { animation: fadeInBlur 0.5s cubic-bezier(0.4, 0, 0.2, 1); }
        .support-card {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .support-link-card {
          transition: all 0.2s ease;
        }
        .support-link-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          background: white !important;
          border-color: #e2e8f0 !important;
        }
        .support-card {
          border-radius: 16px;
          overflow: hidden;
          box-shadow: var(--premium-card-shadow);
        }
        .gradient-text {
          background: var(--premium-accent-gradient);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>

      <div style={{ maxWidth: "1300px", margin: "0 auto", padding: "0 16px" }}>
        <BlockStack gap="400">
          
          {/* --- PREMIUM HEADER --- */}
          <div className="premium-header" style={{ 
            marginBottom: "24px", display: "flex", justifyContent: "space-between", 
            alignItems: "center", padding: "16px 28px", gap: "16px"
          }}>
            <div className="brand-section">
              <button 
                onClick={() => navigate("/app")}
                style={{ 
                  background: "transparent", border: "none", cursor: "pointer", 
                  display: "flex", alignItems: "center", gap: "16px", padding: 0,
                  color: "white"
                }}
              >
                <div style={{
                  width: "44px", height: "44px", borderRadius: "50%", border: "1px solid rgba(255,255,255,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center", background: "white",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)", transition: "transform 0.2s"
                }} className="back-button-hover">
                  <Icon source={ChevronLeftIcon} tone="base" />
                </div>
                <div style={{ textAlign: "left" }}>
                  <h1 style={{ margin: 0, fontSize: "20px", fontWeight: "900", color: "white", letterSpacing: "-0.5px" }}>Support Center</h1>
                  <p style={{ margin: 0, fontSize: "12px", color: "rgba(255, 255, 255, 0.85)", fontWeight: "500" }}>Back to Dashboard</p>
                </div>
              </button>
            </div>

          </div>

          {/* --- EXPERT CONSULTATION BANNER --- */}
          <div style={{ marginBottom: "24px" }}>
            <Card>
              <div style={{ padding: "20px 24px", background: "linear-gradient(90deg, rgba(225, 48, 108, 0.05) 0%, rgba(255, 255, 255, 0) 100%)", borderRadius: "12px" }}>
                <InlineStack align="space-between" blockAlign="center">
                  <InlineStack gap="400" blockAlign="center">
                    <div style={{ 
                      padding: "12px", background: "var(--premium-accent-gradient)", 
                      borderRadius: "14px", color: "white",
                      boxShadow: "0 8px 16px -4px rgba(225, 48, 108, 0.4)" 
                    }}>
                      <Icon source={PersonIcon} tone="inherit" />
                    </div>
                    <BlockStack gap="100">
                      <Text variant="headingMd" as="h3">Need a Design Expert?</Text>
                      <Text variant="bodyMd" tone="subdued">
                        Speak with our professional designers to perfectly match your Instagram feed to your store's theme.
                      </Text>
                    </BlockStack>
                  </InlineStack>
                  <Button variant="primary" onClick={() => window.open("https://calendar.app.google/gwUVdD1FrqMc5R5KA", "_blank")}>
                    Book Calendar
                  </Button>
                </InlineStack>
              </div>
            </Card>
          </div>

          <Layout>
            {/* --- LEFT COLUMN: FAQ --- */}
            <Layout.Section>
              <div style={{ marginTop: "0px" }}>
                <Card>
                  <div style={{ padding: "12px 16px" }}>
                    <BlockStack gap="400">
                      <div>
                        <Text variant="headingLg" as="h3">Frequently Asked Questions</Text>
                        <Text variant="bodySm" tone="subdued">Everything you need to know about setting up and using AI Instafeed.</Text>
                      </div>
                      <Divider />
                      <div>
                        {[
                          {
                            q: "How do I connect my Instagram account?",
                            a: "Simply enter your public Instagram @handle on the dashboard. Our AI discovery automatically fetches your latest posts without requiring password sharing or complex API keys."
                          },
                          {
                            q: "How do I display the Instagram feed on my Shopify store?",
                            a: "Go to Shopify Admin > Online Store > Customize. Click 'Add section' or 'Add block', select 'Instafeed: Feed Grid' or 'Instafeed: Story Layout', position it anywhere on your page, and click Save."
                          },
                          {
                            q: "How often does my Instagram feed automatically update?",
                            a: "The app automatically syncs new posts in the background every 6 hours. You can also trigger an instant refresh anytime by saving your feed settings in the app dashboard."
                          },
                          {
                            q: "Does the app support Instagram Reels and Video posts?",
                            a: "Yes! Instagram Reels, MP4 videos, and Carousel Album posts are fully supported with autoplay, video indicators, cover thumbnail posters, and full-screen popup modal view."
                          },
                          {
                            q: "Can I hide specific posts from showing on my store?",
                            a: "Yes! Toggle on 'Hide Mode' in your app dashboard, then click on any post thumbnail to instantly hide or unhide it from your storefront feed."
                          },
                          {
                            q: "Will this app slow down my website or affect page speed?",
                            a: "No. AI Instafeed is built with native Web Components, lazy-loaded media assets, and an ultra-fast global CDN, ensuring 0ms impact on your store's speed and Lighthouse scores."
                          },
                          {
                            q: "How do I customize the layout for Mobile vs Desktop?",
                            a: "In the Post Feed settings, you can customize column counts independently for desktop (up to 6 columns) and mobile (1 or 2 columns), adjust image gaps, aspect ratios, titles, and typography."
                          },
                          {
                            q: "What is the difference between Starter (Free) and Pro plans?",
                            a: "The Starter plan supports up to 12 posts with standard grid feeds. The Pro plan unlocks unlimited posts, removes the app branding watermark, enables custom post sorting/filtering, and activates AI Comment Moderation."
                          },
                          {
                            q: "Why is a video thumbnail showing a blank frame?",
                            a: "Video posts use Instagram's generated cover poster. If a browser blocks video autoplay (e.g. in Low Power Mode), our built-in video fallback automatically extracts and displays the video's first frame."
                          },
                          {
                            q: "Do I need an Instagram Business or Professional account?",
                            a: "The app works directly with any public Instagram handle. Having an Instagram Business or Creator account connected to a Facebook page ensures maximum stability and access to engagement metrics."
                          }
                        ].map((faq, i, arr) => (
                          <FAQItem key={i} question={faq.q} answer={faq.a} isLast={i === arr.length - 1} />
                        ))}
                      </div>
                    </BlockStack>
                  </div>
                </Card>
              </div>
            </Layout.Section>

            {/* --- RIGHT COLUMN: QUICK CONTACT --- */}
            <Layout.Section variant="oneThird">
              <BlockStack gap="400">
                <Card>
                  <div style={{ padding: "8px" }}>
                    <BlockStack gap="400">
                      <Text variant="headingMd" as="h3" alignment="center">Direct Support</Text>
                      <Text variant="bodyMd" tone="subdued" alignment="center">Get in touch through our official channels.</Text>
                      
                      <div className="support-link-card" style={{ 
                        padding: "16px", borderRadius: "12px", border: "1px solid #f1f5f9", 
                        background: "#f8fafc", cursor: "pointer" 
                      }} onClick={() => window.open(`mailto:${supportEmail}`)}>
                        <InlineStack gap="400" align="start" blockAlign="center">
                          <div style={{ background: "#eff6ff", padding: "10px", borderRadius: "10px", color: "#2563eb" }}>
                            <Icon source={EmailIcon} tone="inherit" />
                          </div>
                          <BlockStack gap="0">
                            <Text variant="bodyMd" fontWeight="bold">Email Us</Text>
                            <Text variant="bodySm" tone="subdued">{supportEmail}</Text>
                          </BlockStack>
                        </InlineStack>
                      </div>

                      <div className="support-link-card" style={{ 
                        padding: "16px", borderRadius: "12px", border: "1px solid #f1f5f9", 
                        background: "#f0fdf4", cursor: "pointer" 
                      }} onClick={() => window.open(`https://wa.me/${whatsappNumber.replace("+", "")}`)}>
                        <InlineStack gap="400" align="start" blockAlign="center">
                          <div style={{ background: "#dcfce7", padding: "10px", borderRadius: "10px", color: "#16a34a" }}>
                            <Icon source={ChatIcon} tone="inherit" />
                          </div>
                          <BlockStack gap="0">
                            <Text variant="bodyMd" fontWeight="bold">WhatsApp Expert</Text>
                            <Text variant="bodySm" tone="subdued">Instant Chat Support</Text>
                          </BlockStack>
                        </InlineStack>
                      </div>

                      <div className="support-link-card" style={{ 
                        padding: "16px", borderRadius: "12px", border: "1px solid #f1f5f9", 
                        background: "#fff7ed", cursor: "pointer" 
                      }} onClick={() => navigate("/app/guide")}>
                        <InlineStack gap="400" align="start" blockAlign="center">
                          <div style={{ background: "#ffedd5", padding: "10px", borderRadius: "10px", color: "#d97706" }}>
                            <Icon source={QuestionCircleIcon} tone="inherit" />
                          </div>
                          <BlockStack gap="0">
                            <Text variant="bodyMd" fontWeight="bold">Help Guide</Text>
                            <Text variant="bodySm" tone="subdued">Detailed Instructions</Text>
                          </BlockStack>
                        </InlineStack>
                      </div>
                    </BlockStack>
                  </div>
                </Card>

                <Card>
                  <div style={{ padding: "8px" }}>
                    <BlockStack gap="300" align="center" textAlign="center">
                      <div style={{
                        width: "60px", height: "60px", borderRadius: "50%", 
                        background: "var(--premium-accent-gradient)", margin: "0 auto",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "0 10px 15px -3px rgba(225, 48, 108, 0.3)"
                      }}>
                        <img 
                          src={whiteLogo} 
                          alt="BOOST STAR Logo" 
                          style={{ width: "32px", height: "auto" }} 
                        />
                      </div>
                      <Text variant="headingMd" alignment="center">BOOST STAR Experts</Text>
                      <Text variant="bodySm" tone="subdued" alignment="center">
                        We are a team of Shopify Experts specialized in social proof and conversion optimization.
                      </Text>
                      <InlineStack align="center">
                        <Badge tone="success">Verified Expert Team</Badge>
                      </InlineStack>
                    </BlockStack>
                  </div>
                </Card>

              </BlockStack>
            </Layout.Section>
          </Layout>

          <footer style={{ textAlign: "center", padding: "40px 0", marginTop: "24px" }}>
            <BlockStack gap="200">
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
                <Text variant="bodySm" tone="subdued">Terms of Service</Text>
                <Text variant="bodySm" tone="subdued">•</Text>
                <Text variant="bodySm" tone="subdued">Privacy Policy</Text>
              </InlineStack>
            </BlockStack>
          </footer>
        </BlockStack>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalConfig.title}
        primaryAction={{
          content: "Done",
          onAction: () => setModalOpen(false),
        }}
      >
        <Modal.Section>
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ 
              marginBottom: "20px", 
              display: "inline-flex", 
              padding: "20px", 
              borderRadius: "50%", 
              background: modalConfig.isError ? "#fef2f2" : "#f0fdf4",
              color: modalConfig.isError ? "#dc2626" : "#16a34a" 
            }}>
              <div style={{ width: "48px" }}>
                <Icon source={modalConfig.isError ? AlertCircleIcon : CheckCircleIcon} tone="inherit" />
              </div>
            </div>
            <h2 style={{ fontSize: "20px", fontWeight: "800", marginBottom: "12px", color: "#1e293b" }}>
              {modalConfig.title}
            </h2>
            <p style={{ color: "#64748b", fontSize: "15px", lineHeight: "1.6" }}>
              {modalConfig.content}
            </p>
          </div>
        </Modal.Section>
      </Modal>
    </div>
  );
}
